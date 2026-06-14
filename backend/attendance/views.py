"""Attendance views — Admin Scanner endpoint, manual attendance, reports."""
import json
import hmac
import hashlib
from datetime import datetime
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.conf import settings

from accounts.permissions import IsAdmin
from employees.models import Employee, EmployeeQR
from settings_app.models import CompanySettings
from .models import Attendance
from audit_logs.models import AuditLog


class QRScanView(APIView):
    """Admin scans Employee QR code to check in/out."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        qr_data_str = request.data.get('qr_data')
        if not qr_data_str:
            return Response({'detail': 'QR data is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Parse JSON
        try:
            qr_data = json.loads(qr_data_str)
        except json.JSONDecodeError:
            return Response({'detail': 'Invalid QR format.'}, status=status.HTTP_400_BAD_REQUEST)

        emp_id = qr_data.get('employee_id')
        emp_code = qr_data.get('employee_code')
        qr_uuid = qr_data.get('uuid')
        provided_signature = qr_data.get('signature')

        if not all([emp_id, emp_code, qr_uuid, provided_signature]):
            return Response({'detail': 'Missing data in QR code.'}, status=status.HTTP_400_BAD_REQUEST)

        # Recompute signature
        # We need to recreate the exact json string without signature
        verification_data = {
            "employee_id": emp_id,
            "employee_code": emp_code,
            "uuid": qr_uuid
        }
        qr_json = json.dumps(verification_data, separators=(',', ':'))
        secret = settings.SECRET_KEY.encode('utf-8')
        expected_signature = hmac.new(secret, qr_json.encode('utf-8'), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected_signature, provided_signature):
            AuditLog.log(request.user, "QR_SCAN_REJECT", f"Invalid QR signature for {emp_code}", request)
            return Response({'detail': 'Invalid or tampered QR code.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            employee = Employee.objects.select_related('user').get(id=emp_id, employee_code=emp_code)
            emp_qr = EmployeeQR.objects.get(employee=employee, qr_id=qr_uuid)
        except (Employee.DoesNotExist, EmployeeQR.DoesNotExist):
            return Response({'detail': 'Employee or QR record not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Get settings
        comp_settings = CompanySettings.get_settings()
        office_start = comp_settings.work_start_time
        grace = comp_settings.grace_minutes
        min_hours = float(comp_settings.minimum_working_hours)
        half_day_hours = float(comp_settings.half_day_hours)

        today = timezone.localdate()
        now_time = timezone.localtime().time()

        scan_type = request.data.get('scan_type', 'auto')
        from datetime import timedelta
        attendance = Attendance.objects.filter(employee=employee, attendance_date=today).first()

        if scan_type == 'check_in':
            if attendance:
                attendance.check_in_time = now_time
                late_threshold = datetime.combine(today, office_start) + timedelta(minutes=grace)
                current_dt = datetime.combine(today, now_time)
                if current_dt > late_threshold:
                    attendance.attendance_status = Attendance.STATUS_LATE
                else:
                    attendance.attendance_status = Attendance.STATUS_PRESENT
                
                if attendance.check_out_time:
                    t1 = datetime.combine(today, now_time)
                    t2 = datetime.combine(today, attendance.check_out_time)
                    diff = t2 - t1
                    hours = max(0.0, diff.total_seconds() / 3600.0)
                    attendance.working_hours = hours
                    if hours < half_day_hours:
                        attendance.attendance_status = Attendance.STATUS_HALF_DAY
                attendance.save()
            else:
                attendance = Attendance.objects.create(
                    employee=employee,
                    attendance_date=today,
                    check_in_time=now_time
                )
                late_threshold = datetime.combine(today, office_start) + timedelta(minutes=grace)
                current_dt = datetime.combine(today, now_time)
                if current_dt > late_threshold:
                    attendance.attendance_status = Attendance.STATUS_LATE
                else:
                    attendance.attendance_status = Attendance.STATUS_PRESENT
                attendance.save()

            AuditLog.log(request.user, "QR_CHECK_IN", f"Check-In {emp_code} at {now_time} (Manual)", request)
            return Response({
                'detail': 'Check-In Recorded Successfully.',
                'employee_name': employee.user.full_name,
                'employee_code': employee.employee_code,
                'in_time': str(now_time)
            })

        elif scan_type == 'check_out':
            if not attendance:
                attendance = Attendance.objects.create(
                    employee=employee,
                    attendance_date=today,
                    check_out_time=now_time,
                    working_hours=0.00,
                    attendance_status=Attendance.STATUS_HALF_DAY
                )
            else:
                attendance.check_out_time = now_time
                if attendance.check_in_time:
                    t1 = datetime.combine(today, attendance.check_in_time)
                    t2 = datetime.combine(today, now_time)
                    diff = t2 - t1
                    hours = max(0.0, diff.total_seconds() / 3600.0)
                    attendance.working_hours = hours
                    
                    if hours < half_day_hours:
                        attendance.attendance_status = Attendance.STATUS_HALF_DAY
                    elif hours >= min_hours:
                        if attendance.attendance_status != Attendance.STATUS_LATE:
                            attendance.attendance_status = Attendance.STATUS_PRESENT
                    else:
                        attendance.attendance_status = Attendance.STATUS_HALF_DAY
                else:
                    attendance.working_hours = 0.00
                    attendance.attendance_status = Attendance.STATUS_HALF_DAY
                attendance.save()

            AuditLog.log(request.user, "QR_CHECK_OUT", f"Check-Out {emp_code} at {now_time} (Manual)", request)
            return Response({
                'detail': 'Checkout Recorded Successfully.',
                'employee_name': employee.user.full_name,
                'employee_code': employee.employee_code,
                'out_time': str(now_time),
                'working_hours': f"{float(attendance.working_hours):.2f}"
            })

        else:
            # auto mode
            if not attendance:
                attendance = Attendance.objects.create(
                    employee=employee,
                    attendance_date=today,
                    check_in_time=now_time
                )
                late_threshold = datetime.combine(today, office_start) + timedelta(minutes=grace)
                current_dt = datetime.combine(today, now_time)
                if current_dt > late_threshold:
                    attendance.attendance_status = Attendance.STATUS_LATE
                else:
                    attendance.attendance_status = Attendance.STATUS_PRESENT
                attendance.save()

                AuditLog.log(request.user, "QR_CHECK_IN", f"Check-In {emp_code} at {now_time}", request)
                return Response({
                    'detail': 'Attendance Recorded Successfully.',
                    'employee_name': employee.user.full_name,
                    'employee_code': employee.employee_code,
                    'in_time': str(now_time)
                })
            else:
                if attendance.check_out_time:
                    AuditLog.log(request.user, "QR_SCAN_REJECT", f"Already checked out: {emp_code}", request)
                    return Response({'detail': 'Attendance Already Completed For Today.'}, status=status.HTTP_400_BAD_REQUEST)
                
                attendance.check_out_time = now_time
                t1 = datetime.combine(today, attendance.check_in_time)
                t2 = datetime.combine(today, now_time)
                diff = t2 - t1
                hours = max(0.0, diff.total_seconds() / 3600.0)
                attendance.working_hours = hours
                
                if hours < half_day_hours:
                    attendance.attendance_status = Attendance.STATUS_HALF_DAY
                elif hours >= min_hours:
                    if attendance.attendance_status != Attendance.STATUS_LATE:
                        attendance.attendance_status = Attendance.STATUS_PRESENT
                else:
                    attendance.attendance_status = Attendance.STATUS_HALF_DAY
                attendance.save()
                
                AuditLog.log(request.user, "QR_CHECK_OUT", f"Check-Out {emp_code} at {now_time}", request)
                return Response({
                    'detail': 'Checkout Recorded Successfully.',
                    'employee_name': employee.user.full_name,
                    'employee_code': employee.employee_code,
                    'out_time': str(now_time),
                    'working_hours': f"{hours:.2f}"
                })


class AttendanceViewSet(viewsets.ModelViewSet):
    """Admin: view/manage all attendance. Employee: view own."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Attendance.objects.select_related('employee__user')
        if user.role == 'admin':
            emp_id = self.request.query_params.get('employee_id')
            month = self.request.query_params.get('month')
            year = self.request.query_params.get('year')
            day = self.request.query_params.get('day')
            if emp_id:
                qs = qs.filter(employee_id=emp_id)
            if month:
                qs = qs.filter(attendance_date__month=month)
            if year:
                qs = qs.filter(attendance_date__year=year)
            if day:
                qs = qs.filter(attendance_date__day=day)
            return qs
        return qs.filter(employee__user=user)

    def get_serializer_class(self):
        from .serializers import AttendanceSerializer
        return AttendanceSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'seed_mock_data']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'], url_path='seed-mock-data')
    def seed_mock_data(self, request):
        from django.utils import timezone
        import random
        from datetime import date, timedelta, time
        from decimal import Decimal
        from .rule_engine import calculate_working_hours, determine_attendance_status
        
        employees = Employee.objects.all()
        if not employees.exists():
            return Response({'detail': 'No employees registered yet. Register some employees first.'}, status=status.HTTP_400_BAD_REQUEST)
            
        today = timezone.localdate()
        count = 0
        
        for emp in employees:
            for d in range(1, 31):
                day_date = today - timedelta(days=d)
                
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
                        
                    check_in_t = time(in_hour, in_minute)
                    check_out_t = time(out_hour, out_minute)
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
                
        return Response({'detail': f'Successfully seeded {count} mock attendance records for existing employees.'}, status=status.HTTP_201_CREATED)

