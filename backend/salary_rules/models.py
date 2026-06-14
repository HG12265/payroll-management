"""
Salary Rules Engine models.
Admin configures salary groups — employees auto-assigned based on basic salary range.
Group A: 0-25000 | Group B: 25001-50000 | Group C: 50001+
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class SalaryGroup(models.Model):
    GROUP_A = 'A'
    GROUP_B = 'B'
    GROUP_C = 'C'
    GROUP_CHOICES = [(GROUP_A, 'Group A'), (GROUP_B, 'Group B'), (GROUP_C, 'Group C')]

    name = models.CharField(max_length=10, unique=True)
    description = models.CharField(max_length=200, blank=True)
    min_salary = models.DecimalField(max_digits=12, decimal_places=2)
    max_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Allowances (percentage of basic salary)
    hra_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                       validators=[MinValueValidator(0), MaxValueValidator(100)])
    da_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                      validators=[MinValueValidator(0), MaxValueValidator(100)])
    medical_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    travel_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Deductions (percentage of basic salary)
    pf_percent = models.DecimalField(max_digits=5, decimal_places=2, default=12,
                                      validators=[MinValueValidator(0), MaxValueValidator(100)])
    esi_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                       validators=[MinValueValidator(0), MaxValueValidator(100)])
    pt_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tds_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                       validators=[MinValueValidator(0), MaxValueValidator(100)])

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'salary_groups'
        ordering = ['min_salary']

    def __str__(self):
        return f"Group {self.name} ({self.min_salary} - {self.max_salary or 'Above'})"

    @classmethod
    def get_group_for_salary(cls, basic_salary):
        """Auto-assign group based on salary range."""
        groups = cls.objects.filter(is_active=True).order_by('min_salary')
        for group in groups:
            if group.max_salary is None or basic_salary <= group.max_salary:
                if basic_salary >= group.min_salary:
                    return group
        return groups.last()
