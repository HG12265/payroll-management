"""Payslip views — generate PDF, serve securely, send email."""
import os
from pathlib import Path
from django.conf import settings
from django.http import FileResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdmin, IsAdminOrOwner
from payroll.models import Payroll
from .models import Payslip
from .pdf_engine import generate_payslip_pdf
from .serializers import PayslipSerializer


class PayslipViewSet(viewsets.ReadOnlyModelViewSet):
    """Payslip management — Admin generates. Employee views own."""
    serializer_class = PayslipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Payslip.objects.select_related('payroll__employee__user')
        if user.role == 'admin':
            qs = qs.all()
        else:
            qs = qs.filter(payroll__employee__user=user)

        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month:
            qs = qs.filter(payroll__month=month)
        if year:
            qs = qs.filter(payroll__year=year)
        return qs

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def generate(self, request):
        """Generate payslips for all processed payrolls for a month/year in the background."""
        import threading
        import logging

        month = request.data.get('month')
        year = request.data.get('year')

        # Evaluate the queryset immediately so the thread doesn't rely on a potentially closed connection/transaction
        payrolls = list(Payroll.objects.filter(
            month=month, year=year,
            status=Payroll.STATUS_PROCESSED,
        ).exclude(payslip__isnull=False))

        if not payrolls:
            return Response({'detail': 'No unprocessed payrolls found for this month/year.'}, status=status.HTTP_404_NOT_FOUND)

        def generate_payslips_task(payrolls_list):
            logger = logging.getLogger(__name__)
            success_count = 0
            failed_count = 0
            for payroll in payrolls_list:
                try:
                    filename = generate_payslip_pdf(payroll)
                    payslip_number = Payslip.generate_payslip_number(
                        payroll.employee, payroll.month, payroll.year
                    )
                    Payslip.objects.create(
                        payroll=payroll,
                        payslip_number=payslip_number,
                        pdf_filename=filename,
                    )
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to generate payslip for {payroll.employee.employee_code}: {e}")
                    failed_count += 1
            
            logger.info(f"Background Payslip Generation Complete: {success_count} success, {failed_count} failed.")

        from audit_logs.models import AuditLog
        AuditLog.log(request.user, AuditLog.ACTION_PAYSLIP,
                     f"Started bulk payslip generation for {month}/{year}", request)

        # Start background thread
        thread = threading.Thread(target=generate_payslips_task, args=(payrolls,))
        thread.daemon = True
        thread.start()

        return Response(
            {'detail': f'Started payslip generation for {len(payrolls)} employees in the background.'}, 
            status=status.HTTP_202_ACCEPTED
        )

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Serve payslip PDF securely with Content-Disposition: attachment."""
        payslip = self.get_object()

        # Object-level permission: employee can only download own payslip
        if request.user.role != 'admin':
            if payslip.payroll.employee.user != request.user:
                return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        pdf_path = Path(settings.PAYSLIP_ROOT) / payslip.pdf_filename

        if not pdf_path.exists():
            # PDF was lost (e.g. after server migration) — regenerate it
            try:
                new_filename = generate_payslip_pdf(payslip.payroll)
                payslip.pdf_filename = new_filename
                payslip.save(update_fields=['pdf_filename'])
                pdf_path = Path(settings.PAYSLIP_ROOT) / new_filename
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to regenerate payslip PDF: {e}")
                return Response({'detail': 'Payslip file not found and could not be regenerated.'}, status=status.HTTP_404_NOT_FOUND)

        # Serve with secure headers — forces download, prevents execution
        response = FileResponse(
            open(pdf_path, 'rb'),
            content_type='application/pdf',
        )
        response['Content-Disposition'] = f'attachment; filename="{payslip.payslip_number}.pdf"'
        response['X-Content-Type-Options'] = 'nosniff'
        return response

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def send_email(self, request, pk=None):
        """Send payslip to employee via email."""
        from notifications.email_service import send_payslip_email
        from pathlib import Path as PathLib
        payslip = self.get_object()

        # Ensure PDF exists before emailing
        pdf_path = PathLib(settings.PAYSLIP_ROOT) / payslip.pdf_filename
        if not pdf_path.exists():
            try:
                new_filename = generate_payslip_pdf(payslip.payroll)
                payslip.pdf_filename = new_filename
                payslip.save(update_fields=['pdf_filename'])
            except Exception as e:
                return Response({'detail': f'PDF regeneration failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        result = send_payslip_email(payslip.payroll.employee, payslip)
        if result == "simulated":
            return Response({'detail': 'Email simulated in console (SMTP credentials failed/missing in .env).'})
        elif result:
            return Response({'detail': 'Email sent successfully.'})
        return Response({'detail': 'Failed to send email. Check SMTP configuration in backend .env'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def send_bulk_emails(self, request):
        """Send all payslip emails for a month/year in the background."""
        import threading
        from notifications.email_service import send_bulk_payslip_emails
        month = request.data.get('month')
        year = request.data.get('year')

        from audit_logs.models import AuditLog
        AuditLog.log(request.user, AuditLog.ACTION_PAYSLIP,
                     f"Started bulk payslip emails for {month}/{year}", request)

        def email_task(m, y):
            import logging
            logger = logging.getLogger(__name__)
            result = send_bulk_payslip_emails(m, y)
            logger.info(f"Background Emailing Complete: {result['sent']} sent, {result['failed']} failed.")

        thread = threading.Thread(target=email_task, args=(month, year))
        thread.daemon = True
        thread.start()

        return Response(
            {'detail': f'Bulk emailing started in the background. Check server logs for progress.'},
            status=status.HTTP_202_ACCEPTED
        )
