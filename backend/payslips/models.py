"""Payslip model."""
import uuid
from django.db import models
from payroll.models import Payroll


class Payslip(models.Model):
    payroll = models.OneToOneField(Payroll, on_delete=models.CASCADE, related_name='payslip')
    payslip_number = models.CharField(max_length=50, unique=True)
    pdf_filename = models.CharField(max_length=255)  # UUID-based filename stored outside web root
    generated_at = models.DateTimeField(auto_now_add=True)
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payslips'
        ordering = ['-generated_at']

    def __str__(self):
        return f"{self.payslip_number} - {self.payroll.employee.employee_code}"

    @classmethod
    def generate_payslip_number(cls, employee, month, year):
        """Generate payslip number like PS-EMP001-06-2026."""
        return f"PS-{employee.employee_code}-{month:02d}-{year}"
