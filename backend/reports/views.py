"""Reports views."""
from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from departments.models import Department
from payroll.models import Payroll
from attendance.models import Attendance
from leave_management.models import Leave


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def payroll_report(request):
    """
    GET /api/reports/payroll/?month=6&year=2026
    Returns total gross payout, deductions, net disbursed, and department-wise charts.
    """
    month = request.query_params.get('month')
    year = request.query_params.get('year')

    if not month or not year:
        return Response({'detail': 'month and year are required.'}, status=400)

    try:
        month = int(month)
        year = int(year)
    except (ValueError, TypeError):
        return Response({'detail': 'Invalid month or year.'}, status=400)

    payrolls = Payroll.objects.filter(month=month, year=year)
    
    total_gross = payrolls.aggregate(val=Sum('gross_salary'))['val'] or 0
    total_ded = payrolls.aggregate(val=Sum('total_deductions'))['val'] or 0
    total_net = payrolls.aggregate(val=Sum('net_salary'))['val'] or 0
    total_employees = payrolls.values('employee').distinct().count()

    summary = {
        "total_employees": total_employees,
        "total_gross_payout": float(total_gross),
        "total_deductions": float(total_ded),
        "net_disbursed": float(total_net)
    }

    depts = Department.objects.all()
    chart_data = []
    for dept in depts:
        dept_payrolls = payrolls.filter(employee__department=dept)
        if dept_payrolls.exists():
            d_gross = dept_payrolls.aggregate(val=Sum('gross_salary'))['val'] or 0
            d_net = dept_payrolls.aggregate(val=Sum('net_salary'))['val'] or 0
            chart_data.append({
                "name": dept.department_name,
                "Gross": float(d_gross),
                "Net": float(d_net)
            })

    return Response({
        "summary": summary,
        "chart_data": chart_data,
        "chart_keys": ["Gross", "Net"]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def attendance_report(request):
    """
    GET /api/reports/attendance/?month=6&year=2026
    Returns total days, present days, absent days, and daily attendance counts.
    """
    month = request.query_params.get('month')
    year = request.query_params.get('year')

    if not month or not year:
        return Response({'detail': 'month and year are required.'}, status=400)

    try:
        month = int(month)
        year = int(year)
    except (ValueError, TypeError):
        return Response({'detail': 'Invalid month or year.'}, status=400)

    attendances = Attendance.objects.filter(
        attendance_date__month=month,
        attendance_date__year=year
    )

    total_records = attendances.count()
    present_days = attendances.filter(attendance_status__in=['present', 'late']).count()
    absent_days = attendances.filter(attendance_status='absent').count()
    half_days = attendances.filter(attendance_status='half_day').count()

    summary = {
        "total_records": total_records,
        "present_days": present_days,
        "absent_days": absent_days,
        "half_days": half_days
    }

    unique_dates = sorted(list(set(attendances.values_list('attendance_date', flat=True))))
    chart_data = []
    for d in unique_dates:
        d_records = attendances.filter(attendance_date=d)
        chart_data.append({
            "name": d.strftime("%d-%b"),
            "Present": d_records.filter(attendance_status__in=['present', 'late']).count(),
            "Absent": d_records.filter(attendance_status='absent').count(),
            "Half Day": d_records.filter(attendance_status='half_day').count(),
        })

    return Response({
        "summary": summary,
        "chart_data": chart_data,
        "chart_keys": ["Present", "Absent", "Half Day"]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def leave_report(request):
    """
    GET /api/reports/leave/?month=6&year=2026
    Returns leaves count and type-wise breakdown charts.
    """
    month = request.query_params.get('month')
    year = request.query_params.get('year')

    if not month or not year:
        return Response({'detail': 'month and year are required.'}, status=400)

    try:
        month = int(month)
        year = int(year)
    except (ValueError, TypeError):
        return Response({'detail': 'Invalid month or year.'}, status=400)

    leaves = Leave.objects.filter(
        from_date__month=month,
        from_date__year=year
    )

    leaves_applied = leaves.count()
    approved_leaves = leaves.filter(status='approved').count()
    rejected_leaves = leaves.filter(status='rejected').count()
    pending_leaves = leaves.filter(status='pending').count()

    summary = {
        "leaves_applied": leaves_applied,
        "approved_leaves": approved_leaves,
        "rejected_leaves": rejected_leaves,
        "pending_leaves": pending_leaves
    }

    chart_data = []
    for key, name in Leave.LEAVE_TYPES:
        l_type_records = leaves.filter(leave_type=key)
        chart_data.append({
            "name": name,
            "Approved": l_type_records.filter(status='approved').count(),
            "Rejected": l_type_records.filter(status='rejected').count(),
            "Pending": l_type_records.filter(status='pending').count(),
        })

    return Response({
        "summary": summary,
        "chart_data": chart_data,
        "chart_keys": ["Approved", "Rejected", "Pending"]
    })
