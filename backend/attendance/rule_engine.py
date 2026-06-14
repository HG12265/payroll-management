"""
Attendance Rule Engine.
- Office Start: 09:00 AM
- Grace Period: 10 minutes (09:10)
- Late: After 09:10
- Half Day: Working hours < 4 hours
- Full Day: >= 8 hours
- Overtime: > 8 hours
"""
from datetime import time, datetime
from decimal import Decimal


OFFICE_START = time(9, 0)   # 09:00 AM
GRACE_END = time(9, 10)     # 09:10 AM (grace period)
HALF_DAY_HOURS = Decimal('4.0')
FULL_DAY_HOURS = Decimal('8.0')


def calculate_working_hours(check_in: time, check_out: time) -> Decimal:
    """Calculate working hours between check-in and check-out."""
    if not check_in or not check_out:
        return Decimal('0')

    dt_in = datetime.combine(datetime.today(), check_in)
    dt_out = datetime.combine(datetime.today(), check_out)

    if dt_out <= dt_in:
        return Decimal('0')

    delta = dt_out - dt_in
    hours = Decimal(str(round(delta.total_seconds() / 3600, 2)))
    return hours


def determine_attendance_status(check_in: time, working_hours: Decimal) -> str:
    """
    Determine attendance status based on rules:
    - Present (on time, >= 8h)
    - Late (after grace, >= 8h)
    - Half Day (< 4h working)
    - Absent (no check-in)
    """
    from .models import Attendance

    if not check_in:
        return Attendance.STATUS_ABSENT

    if working_hours < HALF_DAY_HOURS:
        return Attendance.STATUS_HALF_DAY

    if check_in > GRACE_END:
        return Attendance.STATUS_LATE

    return Attendance.STATUS_PRESENT


def calculate_overtime_hours(working_hours: Decimal) -> Decimal:
    """Calculate overtime hours (above 8 hours)."""
    if working_hours > FULL_DAY_HOURS:
        return working_hours - FULL_DAY_HOURS
    return Decimal('0')


def get_attendance_summary(attendances):
    """
    Given a queryset of attendance records, return a summary dict.
    Used in payroll calculation.
    """
    from .models import Attendance

    total = attendances.count()
    present = attendances.filter(attendance_status__in=[
        Attendance.STATUS_PRESENT, Attendance.STATUS_LATE
    ]).count()
    half_days = attendances.filter(attendance_status=Attendance.STATUS_HALF_DAY).count()
    absent = attendances.filter(attendance_status=Attendance.STATUS_ABSENT).count()
    on_leave = attendances.filter(attendance_status=Attendance.STATUS_LEAVE).count()

    # Effective working days: full days + half_day * 0.5
    effective_days = Decimal(present) + (Decimal(half_days) * Decimal('0.5'))

    return {
        'total_days': total,
        'present_days': present,
        'half_days': half_days,
        'absent_days': absent,
        'on_leave': on_leave,
        'effective_working_days': effective_days,
    }
