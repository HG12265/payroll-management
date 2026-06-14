"""Audit log model and middleware."""
from django.db import models
from accounts.models import User


class AuditLog(models.Model):
    ACTION_LOGIN = 'LOGIN'
    ACTION_LOGOUT = 'LOGOUT'
    ACTION_ATTENDANCE = 'ATTENDANCE'
    ACTION_LEAVE = 'LEAVE'
    ACTION_PAYROLL = 'PAYROLL'
    ACTION_PAYSLIP = 'PAYSLIP'
    ACTION_EMPLOYEE_CREATE = 'EMPLOYEE_CREATE'
    ACTION_EMPLOYEE_UPDATE = 'EMPLOYEE_UPDATE'
    ACTION_SETTINGS = 'SETTINGS'

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=50)
    details = models.TextField(blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} - {self.user} - {self.timestamp}"

    @classmethod
    def log(cls, user, action, details='', request=None):
        """Utility to create audit log entries. Never log sensitive data."""
        ip = None
        if request:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0].strip()
            else:
                ip = request.META.get('REMOTE_ADDR')
        cls.objects.create(user=user, action=action, details=details, ip_address=ip)
