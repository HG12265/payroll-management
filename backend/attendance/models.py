"""Attendance models — QR sessions and attendance records."""
import uuid
from django.db import models
from django.utils import timezone
from employees.models import Employee



class Attendance(models.Model):
    STATUS_PRESENT = 'present'
    STATUS_ABSENT = 'absent'
    STATUS_HALF_DAY = 'half_day'
    STATUS_LATE = 'late'
    STATUS_HOLIDAY = 'holiday'
    STATUS_LEAVE = 'leave'
    STATUS_CHOICES = [
        (STATUS_PRESENT, 'Present'),
        (STATUS_ABSENT, 'Absent'),
        (STATUS_HALF_DAY, 'Half Day'),
        (STATUS_LATE, 'Late'),
        (STATUS_HOLIDAY, 'Holiday'),
        (STATUS_LEAVE, 'On Leave'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendances')
    attendance_date = models.DateField()
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    working_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    attendance_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ABSENT)
    is_manual = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'attendance'
        unique_together = ['employee', 'attendance_date']
        ordering = ['-attendance_date']

    def __str__(self):
        return f"{self.employee.employee_code} - {self.attendance_date} - {self.attendance_status}"
