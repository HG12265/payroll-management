"""Settings app model — system configuration."""
from django.db import models


class CompanySettings(models.Model):
    """Singleton model for company-wide settings."""
    company_name = models.CharField(max_length=200, default='Your Company')
    company_address = models.TextField(default='')
    company_email = models.EmailField(blank=True, default='')
    company_phone = models.CharField(max_length=20, blank=True, default='')
    logo = models.ImageField(upload_to='company/', null=True, blank=True)
    
    # Payroll settings
    pf_enabled = models.BooleanField(default=True)
    esi_enabled = models.BooleanField(default=True)
    pt_enabled = models.BooleanField(default=True)
    
    # Working hours and Attendance
    work_start_time = models.TimeField(default='09:00:00')
    work_end_time = models.TimeField(default='18:00:00')
    grace_minutes = models.IntegerField(default=15)
    half_day_hours = models.DecimalField(max_digits=4, decimal_places=2, default=4.0)
    minimum_working_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8.0)
    
    # Leave quota per year
    casual_leave_quota = models.IntegerField(default=12)
    sick_leave_quota = models.IntegerField(default=12)
    earned_leave_quota = models.IntegerField(default=15)
    
    class Meta:
        db_table = 'company_settings'
        verbose_name = 'Company Settings'
    
    def __str__(self):
        return self.company_name
    
    @classmethod
    def get_settings(cls):
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings
