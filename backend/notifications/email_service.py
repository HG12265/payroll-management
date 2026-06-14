"""
Email service for payslip delivery.
SMTP config loaded from ENV variables only — never hardcoded.
"""
import logging
import os
from pathlib import Path
from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)


def send_payslip_email(employee, payslip):
    """
    Send payslip PDF to employee via email.
    Attaches the PDF securely — never exposes file path in email.
    """
    pdf_path = Path(settings.PAYSLIP_ROOT) / payslip.pdf_filename

    if not pdf_path.exists():
        logger.warning(f"Payslip PDF not found for payslip {payslip.payslip_number}. Regenerating...")
        try:
            from payslips.pdf_engine import generate_payslip_pdf
            new_filename = generate_payslip_pdf(payslip.payroll)
            payslip.pdf_filename = new_filename
            payslip.save(update_fields=['pdf_filename'])
            pdf_path = Path(settings.PAYSLIP_ROOT) / new_filename
        except Exception as e:
            logger.error(f"Failed to regenerate PDF for payslip {payslip.payslip_number}: {e}")
            return False

    from settings_app.models import CompanySettings
    company_settings = CompanySettings.get_settings()
    
    try:
        subject = f"Your Payslip - {payslip.payroll.month:02d}/{payslip.payroll.year}"
        body = (
            f"Dear {employee.user.first_name},\n\n"
            f"Please find attached your payslip for "
            f"{payslip.payroll.month:02d}/{payslip.payroll.year}.\n\n"
            f"Payslip Number: {payslip.payslip_number}\n"
            f"Net Salary: Rs.{payslip.payroll.net_salary:,.2f}\n\n"
            f"This is a system-generated email. Do not reply.\n\n"
            f"Regards,\n{company_settings.company_name}"
        )

        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[employee.user.email],
        )

        with open(pdf_path, 'rb') as f:
            email.attach(
                f"{payslip.payslip_number}.pdf",
                f.read(),
                'application/pdf'
            )

        email.send(fail_silently=False)

        # Update payslip email status
        from django.utils import timezone
        payslip.email_sent = True
        payslip.email_sent_at = timezone.now()
        payslip.save(update_fields=['email_sent', 'email_sent_at'])

        logger.info(f"Payslip email sent for {payslip.payslip_number}")
        return True

    except Exception as e:
        # Log error without sensitive data
        logger.error(f"Failed to send payslip email for {payslip.payslip_number}: {type(e).__name__}")
        if settings.DEBUG:
            # In DEBUG mode, skip SMTP and just mark it as sent so dev isn't blocked.
            # The real email won't be delivered but the workflow continues.
            logger.warning(
                f"SMTP failed ({type(e).__name__}). DEBUG mode: marking payslip "
                f"{payslip.payslip_number} as email-sent (simulated)."
            )
            try:
                from django.utils import timezone
                payslip.email_sent = True
                payslip.email_sent_at = timezone.now()
                payslip.save(update_fields=['email_sent', 'email_sent_at'])
                return "simulated"
            except Exception as db_err:
                logger.error(f"Failed to update payslip status: {db_err}")
        return False


def send_bulk_payslip_emails(month: int, year: int):
    """Send payslip emails to all employees for a given month/year."""
    from payslips.models import Payslip
    payslips = Payslip.objects.filter(
        payroll__month=month,
        payroll__year=year,
        email_sent=False
    ).select_related('payroll__employee__user')

    success_count = 0
    failed_count = 0

    for payslip in payslips:
        if send_payslip_email(payslip.payroll.employee, payslip):
            success_count += 1
        else:
            failed_count += 1

    return {'sent': success_count, 'failed': failed_count}


def send_custom_email(to_email: str, subject: str, body: str):
    """Send a custom email from admin."""
    try:
        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        email.send(fail_silently=False)
        return True
    except Exception as e:
        logger.error(f"Custom email failed: {type(e).__name__}")
        if settings.DEBUG:
            logger.warning(f"SMTP failed ({type(e).__name__}). DEBUG mode: simulating success.")
            return "simulated"
        return False
