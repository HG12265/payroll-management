"""Employee models."""
import uuid
from django.db import models
from departments.models import Department
from accounts.models import User


class Employee(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_INACTIVE = 'inactive'
    STATUS_TERMINATED = 'terminated'
    EMPLOYMENT_STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_INACTIVE, 'Inactive'),
        (STATUS_TERMINATED, 'Terminated'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile')
    employee_code = models.CharField(max_length=20, unique=True)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='employees')
    designation = models.CharField(max_length=100)
    mobile = models.CharField(max_length=15)
    joining_date = models.DateField()
    employment_status = models.CharField(max_length=20, choices=EMPLOYMENT_STATUS_CHOICES, default=STATUS_ACTIVE)
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    profile_picture = models.ImageField(upload_to='employee_pics/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'employees'
        ordering = ['employee_code']

    def __str__(self):
        return f"{self.employee_code} - {self.user.full_name}"

    @classmethod
    def generate_employee_code(cls):
        """Auto-generate sequential employee code like EMP001."""
        last = cls.objects.order_by('-id').first()
        if last:
            last_num = int(last.employee_code.replace('EMP', ''))
            return f"EMP{last_num + 1:03d}"
        return "EMP001"

class EmployeeQR(models.Model):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='qr_code')
    qr_id = models.UUIDField(default=uuid.uuid4, unique=True)
    qr_image = models.ImageField(upload_to='employee_qrs/', null=True, blank=True)
    signature = models.CharField(max_length=256)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'employee_qrs'

    def __str__(self):
        return f"QR - {self.employee.employee_code}"


class RegistrationRequest(models.Model):
    """Tracks self-registration requests pending admin approval."""
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='registration_request')
    mobile = models.CharField(max_length=15)
    joining_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    rejection_reason = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'registration_requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"Registration: {self.user.email} ({self.status})"
