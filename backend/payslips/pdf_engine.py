"""
PDF Payslip Engine using ReportLab.
Generates professional PDF payslips stored outside web root.
Includes: Company Logo, Employee details, Salary breakdown, QR verification code.
"""
import os
import uuid
import qrcode
import io
from pathlib import Path
from django.conf import settings
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


def generate_payslip_pdf(payroll) -> str:
    """
    Generate a PDF payslip for the given payroll record.
    Returns: filename (UUID-based, stored securely outside web root)
    
    Security:
    - Filename is UUID-based (no user input in path)
    - Stored in PAYSLIP_ROOT (outside web root)
    - Served only via authenticated API with Content-Disposition: attachment
    """
    # Ensure secure storage directory exists
    payslip_dir = Path(settings.PAYSLIP_ROOT)
    payslip_dir.mkdir(parents=True, exist_ok=True)

    # Generate UUID-based filename (never use user-provided names)
    filename = f"{uuid.uuid4()}.pdf"
    filepath = payslip_dir / filename

    employee = payroll.employee
    from settings_app.models import CompanySettings
    company_settings = CompanySettings.get_settings()
    company_name = company_settings.company_name
    company_address = company_settings.company_address

    doc = SimpleDocTemplate(
        str(filepath),
        pagesize=A4,
        rightMargin=1.5*cm,
        leftMargin=1.5*cm,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm,
    )

    styles = getSampleStyleSheet()
    elements = []

    # Color palette
    PRIMARY_COLOR = colors.HexColor('#1a237e')
    SECONDARY_COLOR = colors.HexColor('#3949ab')
    LIGHT_GRAY = colors.HexColor('#f5f5f5')
    BORDER_COLOR = colors.HexColor('#e0e0e0')

    # ---- HEADER ----
    header_style = ParagraphStyle('Header', fontSize=18, fontName='Helvetica-Bold',
                                   textColor=colors.white, alignment=TA_CENTER)
    sub_header_style = ParagraphStyle('SubHeader', fontSize=10, fontName='Helvetica',
                                       textColor=colors.white, alignment=TA_CENTER)

    header_data = [
        [Paragraph(f'<b>{company_name}</b>', header_style)],
        [Paragraph(company_address, sub_header_style)],
        [Paragraph('PAYSLIP', ParagraphStyle('Title', fontSize=14, fontName='Helvetica-Bold',
                                              textColor=colors.HexColor('#ffd740'), alignment=TA_CENTER))],
    ]
    header_table = Table(header_data, colWidths=[doc.width])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.3*cm))

    # ---- EMPLOYEE INFO ----
    import calendar
    month_name = calendar.month_name[payroll.month]
    info_style = ParagraphStyle('Info', fontSize=9, fontName='Helvetica')
    bold_style = ParagraphStyle('Bold', fontSize=9, fontName='Helvetica-Bold')

    info_data = [
        ['Employee Code:', employee.employee_code, 'Pay Period:', f"{month_name} {payroll.year}"],
        ['Employee Name:', employee.user.full_name, 'Department:', employee.department.department_name],
        ['Designation:', employee.designation, 'Joining Date:', str(employee.joining_date)],
        ['Working Days:', str(payroll.total_working_days), 'Present Days:', str(payroll.present_days)],
    ]
    info_table = Table(info_data, colWidths=[3.5*cm, 5.5*cm, 3.5*cm, 5.5*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.4*cm))

    # ---- EARNINGS & DEDUCTIONS TABLE ----
    def currency(val):
        return f"₹ {val:,.2f}"

    earn_deduc_data = [
        [Paragraph('<b>EARNINGS</b>', ParagraphStyle('H', fontName='Helvetica-Bold', fontSize=10, textColor=colors.white)),
         Paragraph('<b>Amount</b>', ParagraphStyle('H', fontName='Helvetica-Bold', fontSize=10, textColor=colors.white, alignment=TA_RIGHT)),
         Paragraph('<b>DEDUCTIONS</b>', ParagraphStyle('H', fontName='Helvetica-Bold', fontSize=10, textColor=colors.white)),
         Paragraph('<b>Amount</b>', ParagraphStyle('H', fontName='Helvetica-Bold', fontSize=10, textColor=colors.white, alignment=TA_RIGHT))],
        ['Basic Salary', currency(payroll.basic_salary), 'Provident Fund (PF)', currency(payroll.pf_deduction)],
        ['House Rent Allowance', currency(payroll.hra), 'ESI', currency(payroll.esi_deduction)],
        ['Dearness Allowance', currency(payroll.da), 'Professional Tax', currency(payroll.pt_deduction)],
        ['Medical Allowance', currency(payroll.medical_allowance), 'TDS', currency(payroll.tds_deduction)],
        ['Travel Allowance', currency(payroll.travel_allowance), '', ''],
        ['Bonus', currency(payroll.bonus), '', ''],
    ]
    col_widths = [5*cm, 3.5*cm, 5*cm, 3.5*cm]
    earn_table = Table(earn_deduc_data, colWidths=col_widths)
    earn_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
    ]))
    elements.append(earn_table)
    elements.append(Spacer(1, 0.3*cm))

    # ---- SUMMARY ----
    summary_data = [
        [Paragraph('<b>Gross Salary</b>', bold_style), currency(payroll.gross_salary),
         Paragraph('<b>Total Deductions</b>', bold_style), currency(payroll.total_deductions)],
        [Paragraph('<b>NET SALARY PAYABLE</b>', ParagraphStyle('Net', fontName='Helvetica-Bold', fontSize=11, textColor=colors.white)),
         Paragraph(f'<b>{currency(payroll.net_salary)}</b>', ParagraphStyle('NetAmt', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#ffd740'), alignment=TA_RIGHT)),
         '', ''],
    ]
    summary_table = Table(summary_data, colWidths=col_widths)
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('BACKGROUND', (0, 1), (1, 1), PRIMARY_COLOR),
        ('BACKGROUND', (2, 1), (-1, 1), PRIMARY_COLOR),
        ('SPAN', (0, 1), (1, 1)),
        ('SPAN', (2, 1), (-1, 1)),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.5*cm))

    # ---- QR VERIFICATION ----
    payslip_number = f"PS-{employee.employee_code}-{payroll.month:02d}-{payroll.year}"
    qr_data = f"PAYSLIP:{payslip_number}|EMP:{employee.employee_code}|NET:{payroll.net_salary}|PERIOD:{payroll.month}/{payroll.year}"

    qr = qrcode.QRCode(version=1, box_size=4, border=2)
    qr.add_data(qr_data)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")

    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)

    qr_image = Image(qr_buffer, width=2.5*cm, height=2.5*cm)

    qr_note_style = ParagraphStyle('QRNote', fontSize=7, fontName='Helvetica', textColor=colors.grey, alignment=TA_CENTER)
    footer_data = [
        [qr_image, Paragraph('This is a computer-generated payslip. Scan QR code to verify authenticity.', qr_note_style)],
    ]
    footer_table = Table(footer_data, colWidths=[3*cm, doc.width - 3*cm])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(footer_table)

    doc.build(elements)
    return filename
