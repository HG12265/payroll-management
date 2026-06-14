import datetime
import random
import uuid
import hmac
import hashlib
import json
from decimal import Decimal
from io import BytesIO

from django.core.management.base import BaseCommand
from django.db import transaction
from django.core.files.base import ContentFile
from django.conf import settings

from accounts.models import User
from departments.models import Department
from salary_rules.models import SalaryGroup
from employees.models import Employee, EmployeeQR
from attendance.models import Attendance
from leave_management.models import Leave
from payroll.models import Payroll
from payroll.calculator import calculate_payroll

import qrcode


class Command(BaseCommand):
    help = 'Seeds departments, salary groups, employees, attendance, and calculated payrolls for April and May 2026.'

    def _generate_demo_qr(self, employee):
        """Generate and save permanent QR code for an employee."""
        qr_uuid = str(uuid.uuid4())
        qr_data = {
            "employee_id": employee.id,
            "employee_code": employee.employee_code,
            "uuid": qr_uuid
        }
        qr_json = json.dumps(qr_data, separators=(',', ':'))
        secret = settings.SECRET_KEY.encode('utf-8')
        signature = hmac.new(secret, qr_json.encode('utf-8'), hashlib.sha256).hexdigest()
        qr_data["signature"] = signature
        qr_final_json = json.dumps(qr_data, separators=(',', ':'))

        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(qr_final_json)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format="PNG")

        emp_qr = EmployeeQR(employee=employee, qr_id=qr_uuid, signature=signature)
        emp_qr.qr_image.save(f"{employee.employee_code}_qr.png", ContentFile(buffer.getvalue()), save=True)

    def handle(self, *args, **options):
        self.stdout.write("Starting database seeding...")
        self.stdout.flush()

        # 1. Clean existing employee-related data
        self.stdout.write("Cleaning existing records...")
        self.stdout.flush()
        Payroll.objects.all().delete()
        Leave.objects.all().delete()
        Attendance.objects.all().delete()
        EmployeeQR.objects.all().delete()
        Employee.objects.all().delete()
        User.objects.filter(role=User.EMPLOYEE).delete()
        Department.objects.all().delete()
        SalaryGroup.objects.all().delete()

        # Get or create admin user to approve leaves
        admin_user = User.objects.filter(role=User.ADMIN).first()
        if not admin_user:
            self.stdout.write("Creating superadmin user...")
            admin_user = User.objects.create_superuser(
                email='superadmin@example.com',
                password='SuperAdmin@123',
                first_name='System',
                last_name='Admin',
                is_active=True,
                is_approved=True
            )

        # 2. Create Departments
        self.stdout.write("Creating departments...")
        dept_eng = Department.objects.create(department_code='ENG', department_name='Engineering', description='Software development and IT support', status='active')
        dept_hr = Department.objects.create(department_code='HR', department_name='Human Resources', description='Staffing and employee wellness', status='active')
        dept_fin = Department.objects.create(department_code='FIN', department_name='Finance', description='Accounts and tax filings', status='active')
        dept_mkt = Department.objects.create(department_code='MKT', department_name='Marketing', description='Publicity and branding', status='active')

        # 3. Create Salary Rules
        self.stdout.write("Creating salary groups...")
        # Group A (Basic <= 20000)
        group_a = SalaryGroup.objects.create(
            name='A', description='Basic Salary Range: 0 to 20k',
            min_salary=Decimal('0.00'), max_salary=Decimal('20000.00'),
            hra_percent=Decimal('20.00'), da_percent=Decimal('10.00'),
            medical_allowance=Decimal('1000.00'), travel_allowance=Decimal('1000.00'),
            pf_percent=Decimal('12.00'), esi_percent=Decimal('0.75'), pt_amount=Decimal('0.00'),
            is_active=True
        )
        # Group B (Basic 20001 - 45000)
        group_b = SalaryGroup.objects.create(
            name='B', description='Basic Salary Range: 20k to 45k',
            min_salary=Decimal('20001.00'), max_salary=Decimal('45000.00'),
            hra_percent=Decimal('30.00'), da_percent=Decimal('15.00'),
            medical_allowance=Decimal('1500.00'), travel_allowance=Decimal('1500.00'),
            pf_percent=Decimal('12.00'), esi_percent=Decimal('0.75'), pt_amount=Decimal('200.00'),
            is_active=True
        )
        # Group C (Basic > 45000)
        group_c = SalaryGroup.objects.create(
            name='C', description='Basic Salary Range: 45k+',
            min_salary=Decimal('45001.00'), max_salary=Decimal('150000.00'),
            hra_percent=Decimal('40.00'), da_percent=Decimal('20.00'),
            medical_allowance=Decimal('2000.00'), travel_allowance=Decimal('2000.00'),
            pf_percent=Decimal('12.00'), esi_percent=Decimal('0.75'), pt_amount=Decimal('200.00'),
            is_active=True
        )

        # 4. Create Demo Employees
        self.stdout.write("Creating employees...")
        
        employees_data = [
            {
                'email': 'engineer@example.com', 'first_name': 'Sarath', 'last_name': 'P',
                'employee_code': 'EMP001', 'department': dept_eng, 'designation': 'Software Engineer',
                'mobile': '9876543210', 'joining_date': datetime.date(2026, 1, 15), 'basic_salary': Decimal('35000.00')
            },
            {
                'email': 'hr@example.com', 'first_name': 'Priya', 'last_name': 'K',
                'employee_code': 'EMP002', 'department': dept_hr, 'designation': 'HR Executive',
                'mobile': '8765432109', 'joining_date': datetime.date(2026, 2, 10), 'basic_salary': Decimal('18000.00')
            },
            {
                'email': 'finance@example.com', 'first_name': 'Vikram', 'last_name': 'S',
                'employee_code': 'EMP003', 'department': dept_fin, 'designation': 'Finance Manager',
                'mobile': '7654321098', 'joining_date': datetime.date(2026, 1, 5), 'basic_salary': Decimal('55000.00')
            },
            {
                'email': 'marketing@example.com', 'first_name': 'Anand', 'last_name': 'R',
                'employee_code': 'EMP004', 'department': dept_mkt, 'designation': 'Marketing Specialist',
                'mobile': '6543210987', 'joining_date': datetime.date(2026, 3, 1), 'basic_salary': Decimal('25000.00')
            }
        ]

        employees = []
        for emp_info in employees_data:
            user = User.objects.create_user(
                email=emp_info['email'],
                password='Password123',
                first_name=emp_info['first_name'],
                last_name=emp_info['last_name'],
                role=User.EMPLOYEE,
                is_approved=True,
                is_active=True,
            )
            employee = Employee.objects.create(
                user=user,
                employee_code=emp_info['employee_code'],
                department=emp_info['department'],
                designation=emp_info['designation'],
                mobile=emp_info['mobile'],
                joining_date=emp_info['joining_date'],
                basic_salary=emp_info['basic_salary']
            )
            self._generate_demo_qr(employee)
            employees.append(employee)
            self.stdout.write(f"Created {employee.employee_code} - {user.full_name}")

        emp1, emp2, emp3, emp4 = employees

        # 5. Create Leave Records
        self.stdout.write("Creating leaves...")
        # Priya K (EMP002) - Sick Leave (April 15-16, 2026)
        Leave.objects.create(
            employee=emp2,
            leave_type=Leave.TYPE_SICK,
            from_date=datetime.date(2026, 4, 15),
            to_date=datetime.date(2026, 4, 16),
            number_of_days=2,
            reason='High fever and cold',
            status=Leave.STATUS_APPROVED,
            approved_by=admin_user
        )
        # Vikram S (EMP003) - Casual Leave (May 11, 2026)
        Leave.objects.create(
            employee=emp3,
            leave_type=Leave.TYPE_CASUAL,
            from_date=datetime.date(2026, 5, 11),
            to_date=datetime.date(2026, 5, 11),
            number_of_days=1,
            reason='Personal bank work',
            status=Leave.STATUS_APPROVED,
            approved_by=admin_user
        )

        # Helper functions for generating daily attendance times
        def generate_times(status):
            if status == Attendance.STATUS_PRESENT:
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

            elif status == Attendance.STATUS_LATE:
                in_hour = 9
                in_minute = random.randint(35, 59)
                if random.random() > 0.5:
                    in_hour = 10
                    in_minute = random.randint(0, 15)

                out_hour = 17
                out_minute = random.randint(45, 59)
                if random.random() > 0.5:
                    out_hour = 18
                    out_minute = random.randint(0, 30)

            else:  # HALF_DAY
                in_hour = 8
                in_minute = random.randint(50, 59)
                if random.random() > 0.5:
                    in_hour = 9
                    in_minute = random.randint(0, 10)

                out_hour = 13
                out_minute = random.randint(0, 30)

            in_time = datetime.time(in_hour, in_minute)
            out_time = datetime.time(out_hour, out_minute)

            in_decimal = in_hour + in_minute / 60.0
            out_decimal = out_hour + out_minute / 60.0
            working_hours = Decimal(f"{out_decimal - in_decimal:.2f}")

            return in_time, out_time, working_hours

        def get_approved_leave_dates(employee, month, year):
            leave_dates = set()
            leaves = Leave.objects.filter(employee=employee, status=Leave.STATUS_APPROVED)
            for leave in leaves:
                curr = leave.from_date
                while curr <= leave.to_date:
                    if curr.month == month and curr.year == year:
                        leave_dates.add(curr)
                    curr += datetime.timedelta(days=1)
            return leave_dates

        # 6. Generate Attendance records
        self.stdout.write("Generating attendance records...")
        months = [(4, 2026), (5, 2026)]

        for emp in employees:
            for month, year in months:
                leave_dates = get_approved_leave_dates(emp, month, year)
                last_day = datetime.date(year, month + 1 if month < 12 else 1, 1) - datetime.timedelta(days=1)
                num_days = last_day.day

                for day in range(1, num_days + 1):
                    day_date = datetime.date(year, month, day)

                    # Skip Sundays
                    if day_date.weekday() == 6:
                        continue

                    if day_date in leave_dates:
                        # Create Leave attendance record
                        Attendance.objects.create(
                            employee=emp,
                            attendance_date=day_date,
                            attendance_status=Attendance.STATUS_LEAVE,
                            working_hours=Decimal('0.00'),
                            check_in_time=None,
                            check_out_time=None
                        )
                    else:
                        # Pick a random check-in/out status
                        rnd = random.random()
                        if rnd < 0.85:
                            status = Attendance.STATUS_PRESENT
                        elif rnd < 0.95:
                            status = Attendance.STATUS_LATE
                        else:
                            status = Attendance.STATUS_HALF_DAY

                        in_t, out_t, hours = generate_times(status)
                        Attendance.objects.create(
                            employee=emp,
                            attendance_date=day_date,
                            attendance_status=status,
                            check_in_time=in_t,
                            check_out_time=out_t,
                            working_hours=hours
                        )

        # 7. Generate Calculated Payroll records
        self.stdout.write("Calculating and generating payroll records...")
        for month, year in months:
            for emp in employees:
                calculate_payroll(emp, month, year)
                self.stdout.write(f"Calculated payroll for {emp.employee_code} - {month}/{year}")

        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully!"))
