"""Leave management models."""
from django.db import models
from employees.models import Employee
from accounts.models import User


class Leave(models.Model):
    TYPE_CASUAL = 'casual'
    TYPE_SICK = 'sick'
    TYPE_EARNED = 'earned'
    TYPE_LOP = 'loss_of_pay'
    LEAVE_TYPES = [
        (TYPE_CASUAL, 'Casual Leave'),
        (TYPE_SICK, 'Sick Leave'),
        (TYPE_EARNED, 'Earned Leave'),
        (TYPE_LOP, 'Loss of Pay'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leaves')
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPES)
    from_date = models.DateField()
    to_date = models.DateField()
    number_of_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    approved_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='approved_leaves'
    )
    rejection_reason = models.TextField(blank=True, default='')
    applied_on = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'leaves'
        ordering = ['-applied_on']

    def __str__(self):
        return f"{self.employee.employee_code} - {self.leave_type} - {self.status}"
