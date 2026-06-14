import datetime
import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from employees.models import Employee
from attendance.models import Attendance
from attendance.rule_engine import calculate_working_hours, determine_attendance_status

class Command(BaseCommand):
    help = 'Seeds mock attendance records for the last 30 days for all currently registered employees (skipping Sundays and existing records).'

    def handle(self, *args, **options):
        self.stdout.write("Starting mock attendance seeding for existing employees...")
        self.stdout.flush()

        employees = Employee.objects.all()
        if not employees.exists():
            self.stdout.write(self.style.ERROR("No employees registered yet. Seeding skipped."))
            return

        today = timezone.localdate()
        count = 0

        for emp in employees:
            self.stdout.write(f"Generating records for {emp.employee_code} - {emp.user.full_name}...")
            for d in range(1, 31):
                day_date = today - datetime.timedelta(days=d)

                if day_date.weekday() == 6:  # Sunday
                    continue

                if Attendance.objects.filter(employee=emp, attendance_date=day_date).exists():
                    continue

                r = random.random()
                if r < 0.80:
                    status_choice = Attendance.STATUS_PRESENT
                elif r < 0.90:
                    status_choice = Attendance.STATUS_LATE
                elif r < 0.95:
                    status_choice = Attendance.STATUS_HALF_DAY
                else:
                    status_choice = Attendance.STATUS_ABSENT

                if status_choice == Attendance.STATUS_ABSENT:
                    Attendance.objects.create(
                        employee=emp,
                        attendance_date=day_date,
                        attendance_status=Attendance.STATUS_ABSENT,
                        working_hours=Decimal('0.00'),
                        check_in_time=None,
                        check_out_time=None
                    )
                else:
                    if status_choice == Attendance.STATUS_PRESENT:
                        in_hour = 8
                        in_minute = random.randint(45, 59)
                        if random.random() > 0.5:
                            in_hour = 9
                            in_minute = random.randint(0, 5)
                        out_hour = 17
                        out_minute = random.randint(30, 59)
                        if random.random() > 0.5:
                            out_hour = 18
                            out_minute = random.randint(0, 15)
                    elif status_choice == Attendance.STATUS_LATE:
                        in_hour = 9
                        in_minute = random.randint(11, 59)
                        out_hour = 17
                        out_minute = random.randint(30, 59)
                    else: # Half Day
                        in_hour = 8
                        in_minute = random.randint(45, 59)
                        if random.random() > 0.5:
                            in_hour = 9
                            in_minute = random.randint(0, 10)
                        out_hour = 13
                        out_minute = random.randint(0, 30)

                    check_in_t = datetime.time(in_hour, in_minute)
                    check_out_t = datetime.time(out_hour, out_minute)
                    hours = calculate_working_hours(check_in_t, check_out_t)
                    final_status = determine_attendance_status(check_in_t, hours)

                    Attendance.objects.create(
                        employee=emp,
                        attendance_date=day_date,
                        check_in_time=check_in_t,
                        check_out_time=check_out_t,
                        working_hours=hours,
                        attendance_status=final_status,
                        is_manual=False
                    )
                count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {count} mock attendance records!"))
