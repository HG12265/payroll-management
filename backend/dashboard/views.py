"""Dashboard views."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Sum
from accounts.models import User
from employees.models import Employee
from attendance.models import Attendance
from leave_management.models import Leave
from payroll.models import Payroll
from payslips.models import Payslip


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_dashboard(request):
    """Admin dashboard stats."""
    if request.user.role != User.ADMIN:
        return Response({'detail': 'Admin only.'}, status=403)

    today = timezone.localdate()
    current_month = today.month
    current_year = today.year

    total_employees = Employee.objects.filter(employment_status='active').count()

    today_att = Attendance.objects.filter(attendance_date=today)
    present_today = today_att.filter(attendance_status='present').count()
    absent_today = today_att.filter(attendance_status='absent').count()
    on_leave_today = today_att.filter(attendance_status='on_leave').count()

    pending_leaves = Leave.objects.filter(status='pending').count()
    payroll_processed = Payroll.objects.filter(
        month=current_month, year=current_year, status='processed'
    ).count()

    return Response({
        'total_employees': total_employees,
        'present_today': present_today,
        'absent_today': absent_today,
        'on_leave_today': on_leave_today,
        'pending_leaves': pending_leaves,
        'payroll_processed_this_month': payroll_processed,
        'date': str(today),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_dashboard(request):
    """Employee dashboard stats."""
    try:
        employee = request.user.employee_profile
    except AttributeError:
        return Response({'detail': 'No employee profile found.'}, status=404)

    today = timezone.localdate()
    current_month = today.month
    current_year = today.year

    month_att = Attendance.objects.filter(employee=employee, attendance_date__month=current_month, attendance_date__year=current_year)
    present_days = month_att.filter(attendance_status='present').count()
    absent_days = month_att.filter(attendance_status='absent').count()

    leave_taken = Leave.objects.filter(
        employee=employee, status='approved',
        from_date__year=current_year
    ).aggregate(total=Sum('number_of_days'))['total'] or 0

    latest_payslip = Payslip.objects.filter(payroll__employee=employee).order_by('-generated_at').first()
    payslip_data = None
    if latest_payslip:
        payslip_data = {
            'payslip_number': latest_payslip.payslip_number,
            'net_salary': str(latest_payslip.payroll.net_salary),
            'month': latest_payslip.payroll.month,
            'year': latest_payslip.payroll.year,
        }

    return Response({
        'present_days': present_days,
        'absent_days': absent_days,
        'leave_taken_this_year': leave_taken,
        'latest_payslip': payslip_data,
    })
