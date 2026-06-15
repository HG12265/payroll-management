from django.urls import path
from .views import payroll_report, attendance_report, leave_report

urlpatterns = [
    path('payroll/', payroll_report, name='payroll_report'),
    path('attendance/', attendance_report, name='attendance_report'),
    path('leave/', leave_report, name='leave_report'),
]
