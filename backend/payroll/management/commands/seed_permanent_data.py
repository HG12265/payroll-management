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
from faker import Faker


class Command(BaseCommand):
    help = 'Permanent Seed: Clears database and generates 50 realistic employees with 6 months of historical data.'

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
        self.stdout.write(self.style.WARNING("Starting Massive Database Seeding. This may take a minute..."))
        self.stdout.flush()

        fake = Faker('en_IN')  # Use Indian localization for realistic names/phones
        Faker.seed(42)
        random.seed(42)

        with transaction.atomic():
            # 1. Clean existing employee-related data
            self.stdout.write("Cleaning existing records...")
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
            departments_data = [
                ('ENG', 'Engineering', 'Software development and IT operations'),
                ('SAL', 'Sales', 'B2B and B2C sales'),
                ('HR', 'Human Resources', 'Staffing, recruiting, and employee wellness'),
                ('FIN', 'Finance', 'Accounts, payroll, and tax filings'),
                ('MKT', 'Marketing', 'Publicity, SEO, and branding'),
                ('OPS', 'Operations', 'Daily business operations and logistics')
            ]
            departments = []
            for code, name, desc in departments_data:
                dept = Department.objects.create(department_code=code, department_name=name, description=desc, status='active')
                departments.append(dept)

            # 3. Create Salary Rules
            self.stdout.write("Creating salary groups...")
            sg_a = SalaryGroup.objects.create(
                name='Group A', description='Entry Level Employees',
                min_salary=Decimal('0.00'), max_salary=Decimal('20000.00'),
                hra_percent=Decimal('20.00'), da_percent=Decimal('10.00'),
                medical_allowance=Decimal('1000.00'), travel_allowance=Decimal('1000.00'),
                pf_percent=Decimal('12.00'), esi_percent=Decimal('0.75'), pt_amount=Decimal('0.00'),
                is_active=True
            )
            sg_b = SalaryGroup.objects.create(
                name='Group B', description='Mid Level Professionals',
                min_salary=Decimal('20001.00'), max_salary=Decimal('50000.00'),
                hra_percent=Decimal('30.00'), da_percent=Decimal('15.00'),
                medical_allowance=Decimal('1500.00'), travel_allowance=Decimal('1500.00'),
                pf_percent=Decimal('12.00'), esi_percent=Decimal('0.75'), pt_amount=Decimal('200.00'),
                is_active=True
            )
            sg_c = SalaryGroup.objects.create(
                name='Group C', description='Management and Senior Roles',
                min_salary=Decimal('50001.00'), max_salary=Decimal('150000.00'),
                hra_percent=Decimal('40.00'), da_percent=Decimal('20.00'),
                medical_allowance=Decimal('2000.00'), travel_allowance=Decimal('2000.00'),
                pf_percent=Decimal('12.00'), esi_percent=Decimal('0.75'), pt_amount=Decimal('200.00'),
                is_active=True
            )

            # 4. Create 50 Employees
            self.stdout.write("Generating 4 realistic employees...")
            employees = []
            for i in range(1, 5):
                first_name = fake.first_name()
                last_name = fake.last_name()
                email = f"{first_name.lower()}.{last_name.lower()}{i}@example.com"
                
                # Distribution of salaries
                if i <= 15:
                    basic = Decimal(random.randint(12000, 19500))
                    designation = random.choice(['Junior Executive', 'Associate', 'Trainee', 'Assistant'])
                elif i <= 40:
                    basic = Decimal(random.randint(22000, 48000))
                    designation = random.choice(['Senior Executive', 'Specialist', 'Analyst', 'Engineer'])
                else:
                    basic = Decimal(random.randint(55000, 120000))
                    designation = random.choice(['Manager', 'Director', 'Lead', 'Head'])

                user = User.objects.create_user(
                    email=email,
                    password='Password123',
                    first_name=first_name,
                    last_name=last_name,
                    role=User.EMPLOYEE,
                    is_approved=True,
                    is_active=True,
                )
                
                join_date = fake.date_between(start_date='-2y', end_date='-6m')
                employee = Employee.objects.create(
                    user=user,
                    employee_code=f'EMP{i:03d}',
                    department=random.choice(departments),
                    designation=designation,
                    mobile=fake.phone_number()[:15].replace(' ', ''),
                    joining_date=join_date,
                    basic_salary=basic
                )
                self._generate_demo_qr(employee)
                employees.append(employee)

            # Helpers for Attendance
            def generate_times(status):
                if status == Attendance.STATUS_PRESENT:
                    in_hour, in_minute = 8, random.randint(45, 59)
                    if random.random() > 0.5:
                        in_hour, in_minute = 9, random.randint(0, 5)
                    out_hour, out_minute = 17, random.randint(30, 59)
                    if random.random() > 0.5:
                        out_hour, out_minute = 18, random.randint(0, 15)
                elif status == Attendance.STATUS_LATE:
                    in_hour, in_minute = 9, random.randint(35, 59)
                    if random.random() > 0.5:
                        in_hour, in_minute = 10, random.randint(0, 15)
                    out_hour, out_minute = 17, random.randint(45, 59)
                    if random.random() > 0.5:
                        out_hour, out_minute = 18, random.randint(0, 30)
                else:  # HALF_DAY
                    in_hour, in_minute = 8, random.randint(50, 59)
                    if random.random() > 0.5:
                        in_hour, in_minute = 9, random.randint(0, 10)
                    out_hour, out_minute = 13, random.randint(0, 30)

                in_t = datetime.time(in_hour, in_minute)
                out_t = datetime.time(out_hour, out_minute)
                hours = Decimal(f"{(out_hour + out_minute / 60.0) - (in_hour + in_minute / 60.0):.2f}")
                return in_t, out_t, hours

            # Generate 6 Months of Historical Data (Jan 2026 - Jun 2026)
            self.stdout.write("Generating 6 months of historical attendance and leaves...")
            months = [(1, 2026), (2, 2026), (3, 2026), (4, 2026), (5, 2026), (6, 2026)]

            attendance_bulk = []
            
            for month, year in months:
                last_day_val = datetime.date(year, month + 1 if month < 12 else 1, 1) - datetime.timedelta(days=1)
                num_days = last_day_val.day

                for emp in employees:
                    # Give each employee 0 to 2 days of approved leave per month
                    leave_days = []
                    if random.random() > 0.6:  # 40% chance of taking leave
                        leave_duration = random.choice([1, 2])
                        start_leave = random.randint(1, num_days - leave_duration)
                        for d in range(start_leave, start_leave + leave_duration):
                            leave_days.append(datetime.date(year, month, d))
                        
                        Leave.objects.create(
                            employee=emp,
                            leave_type=random.choice([Leave.TYPE_SICK, Leave.TYPE_CASUAL, Leave.TYPE_EARNED]),
                            from_date=datetime.date(year, month, start_leave),
                            to_date=datetime.date(year, month, start_leave + leave_duration - 1),
                            number_of_days=leave_duration,
                            reason='Random generated leave',
                            status=Leave.STATUS_APPROVED,
                            approved_by=admin_user
                        )

                    for day in range(1, num_days + 1):
                        day_date = datetime.date(year, month, day)

                        # Skip Sundays
                        if day_date.weekday() == 6:
                            continue

                        if day_date in leave_days:
                            attendance_bulk.append(Attendance(
                                employee=emp, attendance_date=day_date,
                                attendance_status=Attendance.STATUS_LEAVE,
                                working_hours=Decimal('0.00'), check_in_time=None, check_out_time=None
                            ))
                        else:
                            rnd = random.random()
                            if rnd < 0.90: status = Attendance.STATUS_PRESENT
                            elif rnd < 0.96: status = Attendance.STATUS_LATE
                            elif rnd < 0.98: status = Attendance.STATUS_HALF_DAY
                            else: status = Attendance.STATUS_ABSENT

                            if status == Attendance.STATUS_ABSENT:
                                attendance_bulk.append(Attendance(
                                    employee=emp, attendance_date=day_date,
                                    attendance_status=status,
                                    working_hours=Decimal('0.00'), check_in_time=None, check_out_time=None
                                ))
                            else:
                                in_t, out_t, hours = generate_times(status)
                                attendance_bulk.append(Attendance(
                                    employee=emp, attendance_date=day_date,
                                    attendance_status=status, check_in_time=in_t,
                                    check_out_time=out_t, working_hours=hours
                                ))
            
            # Bulk create attendance
            Attendance.objects.bulk_create(attendance_bulk)

            # 7. Generate Calculated Payroll records
            self.stdout.write("Calculating and generating payroll records...")
            for month, year in months:
                for emp in employees:
                    calculate_payroll(emp, month, year)

        self.stdout.write(self.style.SUCCESS("✅ Database seeding completed successfully! 4 Employees and 6 months of data generated."))
