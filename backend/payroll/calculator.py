"""
Payroll Calculation Engine.
Takes attendance, leave, employee salary data → computes full payroll.
"""
import calendar
from decimal import Decimal
from django.utils import timezone

from attendance.models import Attendance
from attendance.rule_engine import get_attendance_summary
from salary_rules.models import SalaryGroup
from .models import Payroll


def calculate_payroll(employee, month: int, year: int, bonus: Decimal = Decimal('0')) -> Payroll:
    """
    Core payroll calculation engine.
    
    Steps:
    1. Fetch attendance for month
    2. Get total working days in month
    3. Get salary group for employee
    4. Calculate pro-rated basic salary
    5. Calculate allowances (HRA, DA, Medical, Travel, Bonus)
    6. Calculate deductions (PF, ESI, PT, TDS)
    7. Compute Gross and Net salary
    8. Save and return Payroll record
    """
    # Step 1: Fetch attendance
    attendances = Attendance.objects.filter(
        employee=employee,
        attendance_date__month=month,
        attendance_date__year=year,
    )

    # Step 2: Total working days in month (excluding Sundays)
    total_days = calendar.monthrange(year, month)[1]
    working_days = sum(
        1 for d in range(1, total_days + 1)
        if calendar.weekday(year, month, d) != 6  # 6 = Sunday
    )

    # Step 3: Get attendance summary
    summary = get_attendance_summary(attendances)
    effective_days = summary['effective_working_days']

    # Step 4: Get salary group
    basic = employee.basic_salary
    salary_group = SalaryGroup.get_group_for_salary(basic)

    if working_days > 0:
        pro_rated_basic = (basic * effective_days / Decimal(working_days)).quantize(Decimal('0.01'))
    else:
        pro_rated_basic = Decimal('0')

    # Step 5: Calculate allowances
    hra = (pro_rated_basic * salary_group.hra_percent / 100).quantize(Decimal('0.01')) if salary_group else Decimal('0')
    da = (pro_rated_basic * salary_group.da_percent / 100).quantize(Decimal('0.01')) if salary_group else Decimal('0')
    medical = salary_group.medical_allowance if salary_group else Decimal('0')
    travel = salary_group.travel_allowance if salary_group else Decimal('0')

    gross = pro_rated_basic + hra + da + medical + travel + bonus

    # Step 6: Calculate deductions (on actual basic, not pro-rated — per Indian law)
    pf = (basic * salary_group.pf_percent / 100).quantize(Decimal('0.01')) if salary_group else Decimal('0')
    esi = (gross * salary_group.esi_percent / 100).quantize(Decimal('0.01')) if salary_group else Decimal('0')
    pt = salary_group.pt_amount if salary_group else Decimal('0')
    tds = (gross * salary_group.tds_percent / 100).quantize(Decimal('0.01')) if salary_group else Decimal('0')

    total_deductions = pf + esi + pt + tds
    net = (gross - total_deductions).quantize(Decimal('0.01'))

    # Step 7: Save payroll record
    payroll, created = Payroll.objects.update_or_create(
        employee=employee,
        month=month,
        year=year,
        defaults={
            'total_working_days': working_days,
            'present_days': effective_days,
            'basic_salary': pro_rated_basic,
            'hra': hra,
            'da': da,
            'medical_allowance': medical,
            'travel_allowance': travel,
            'bonus': bonus,
            'gross_salary': gross,
            'pf_deduction': pf,
            'esi_deduction': esi,
            'pt_deduction': pt,
            'tds_deduction': tds,
            'total_deductions': total_deductions,
            'net_salary': net,
            'status': Payroll.STATUS_PROCESSED,
            'processed_at': timezone.now(),
        }
    )

    return payroll
