"""
Payroll models and core calculation engine.
Formula:
  Gross = Basic + HRA + DA + Medical + Travel + Bonus
  Net = Gross - PF - ESI - PT - TDS
"""
from django.db import models
from decimal import Decimal
from employees.models import Employee


class Payroll(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_PROCESSED = 'processed'
    STATUS_PAID = 'paid'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PROCESSED, 'Processed'),
        (STATUS_PAID, 'Paid'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payrolls')
    month = models.IntegerField()   # 1-12
    year = models.IntegerField()

    # Working days
    total_working_days = models.IntegerField(default=0)
    present_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)

    # Allowances
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    hra = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    da = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    medical_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    travel_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Deductions
    pf_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    esi_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pt_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tds_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payrolls'
        unique_together = ['employee', 'month', 'year']
        ordering = ['-year', '-month']

    def __str__(self):
        return f"{self.employee.employee_code} - {self.month}/{self.year}"
