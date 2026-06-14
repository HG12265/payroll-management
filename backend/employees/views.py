from django.db import transaction
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from accounts.models import User
from accounts.permissions import IsAdmin, IsAdminOrOwner
from departments.models import Department
from .models import Employee, EmployeeQR, RegistrationRequest
import json
import uuid
import hmac
import hashlib
import qrcode
from io import BytesIO
from django.core.files.base import ContentFile
from django.conf import settings
from .serializers import EmployeeListSerializer, EmployeeDetailSerializer, EmployeeCreateSerializer


def _generate_employee_qr(employee):
    """Helper: generate and save permanent QR code for an employee."""
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


class EmployeeViewSet(viewsets.ModelViewSet):
    """Employee management — Admin CRUD, Employee read-own."""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee_code', 'user__first_name', 'user__last_name', 'designation']
    ordering_fields = ['employee_code', 'joining_date', 'basic_salary']

    def get_queryset(self):
        user = self.request.user
        qs = Employee.objects.select_related('user', 'department')
        if user.role == 'admin':
            return qs.all()
        return qs.filter(user=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return EmployeeCreateSerializer
        if self.action in ['list']:
            return EmployeeListSerializer
        return EmployeeDetailSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        if self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create employee + user account in a single transaction (Admin direct creation)."""
        serializer = EmployeeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = User.objects.create_user(
            email=data['email'],
            password=data['password'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=User.EMPLOYEE,
            is_approved=True,  # Admin-created users are auto-approved
        )

        department = Department.objects.get(id=data['department_id'])
        employee_code = Employee.generate_employee_code()

        employee = Employee.objects.create(
            user=user,
            employee_code=employee_code,
            department=department,
            designation=data['designation'],
            mobile=data['mobile'],
            joining_date=data['joining_date'],
            basic_salary=data['basic_salary'],
        )

        _generate_employee_qr(employee)

        from audit_logs.models import AuditLog
        AuditLog.log(request.user, AuditLog.ACTION_EMPLOYEE_CREATE,
                     f"Created employee {employee_code}", request)

        return Response(
            EmployeeDetailSerializer(employee).data,
            status=status.HTTP_201_CREATED
        )


# ─── Registration Request Management ───────────────────────────────────────────

class PendingRegistrationsView(APIView):
    """GET /api/employees/pending/ — List all pending registration requests (Admin only)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        reqs = RegistrationRequest.objects.select_related('user').filter(status=RegistrationRequest.STATUS_PENDING)
        data = [{
            'id': r.id,
            'user_id': str(r.user.id),
            'full_name': r.user.full_name,
            'email': r.user.email,
            'mobile': r.mobile,
            'joining_date': str(r.joining_date) if r.joining_date else None,
            'notes': r.notes,
            'created_at': r.created_at.isoformat(),
        } for r in reqs]
        return Response(data)


class ApproveRegistrationView(APIView):
    """POST /api/employees/approve/<id>/ — Admin approves with dept + salary (Admin only)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    @transaction.atomic
    def post(self, request, pk):
        try:
            reg = RegistrationRequest.objects.select_related('user').get(pk=pk, status=RegistrationRequest.STATUS_PENDING)
        except RegistrationRequest.DoesNotExist:
            return Response({'detail': 'Registration request not found or already processed.'}, status=status.HTTP_404_NOT_FOUND)

        department_id = request.data.get('department_id')
        designation = request.data.get('designation', '').strip()
        basic_salary = request.data.get('basic_salary')

        if not all([department_id, designation, basic_salary]):
            return Response({'detail': 'Department, designation and basic salary are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            department = Department.objects.get(id=department_id)
        except Department.DoesNotExist:
            return Response({'detail': 'Department not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Mark user as approved — use full save() to ensure all fields persist
        user = reg.user
        user.is_approved = True
        user.is_active = True  # Ensure active too
        user.save()  # full save, not update_fields

        # Create Employee profile
        employee_code = Employee.generate_employee_code()
        employee = Employee.objects.create(
            user=user,
            employee_code=employee_code,
            department=department,
            designation=designation,
            mobile=reg.mobile,
            joining_date=reg.joining_date,
            basic_salary=basic_salary,
        )

        # Generate QR
        _generate_employee_qr(employee)

        # Update registration status
        reg.status = RegistrationRequest.STATUS_APPROVED
        reg.save()  # full save

        from audit_logs.models import AuditLog
        AuditLog.log(request.user, AuditLog.ACTION_EMPLOYEE_CREATE,
                     f"Approved registration for {user.email} as {employee_code}", request)

        return Response({'detail': f'Registration approved. Employee {employee_code} created.', 'employee_code': employee_code})


class RejectRegistrationView(APIView):
    """POST /api/employees/reject/<id>/ — Admin rejects a registration (Admin only)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            reg = RegistrationRequest.objects.select_related('user').get(pk=pk, status=RegistrationRequest.STATUS_PENDING)
        except RegistrationRequest.DoesNotExist:
            return Response({'detail': 'Registration request not found or already processed.'}, status=status.HTTP_404_NOT_FOUND)

        reason = request.data.get('reason', '').strip()
        reg.status = RegistrationRequest.STATUS_REJECTED
        reg.rejection_reason = reason
        reg.save(update_fields=['status', 'rejection_reason'])

        # Deactivate the user account
        reg.user.is_active = False
        reg.user.save(update_fields=['is_active'])

        return Response({'detail': 'Registration rejected.'})


class ToggleEmployeeStatusView(APIView):
    """
    POST /api/employees/toggle-status/<employee_id>/
    Admin can enable (active) or disable (inactive) an employee account.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            employee = Employee.objects.select_related('user').get(pk=pk)
        except Employee.DoesNotExist:
            return Response({'detail': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')  # 'enable' or 'disable'

        if action == 'enable':
            employee.employment_status = Employee.STATUS_ACTIVE
            employee.user.is_active = True
            employee.user.save()
            employee.save()
            return Response({'detail': f'{employee.user.full_name} enabled successfully.', 'status': 'active'})
        elif action == 'disable':
            employee.employment_status = Employee.STATUS_INACTIVE
            employee.user.is_active = False
            employee.user.save()
            employee.save()
            return Response({'detail': f'{employee.user.full_name} disabled successfully.', 'status': 'inactive'})
        else:
            return Response({'detail': 'Invalid action. Use "enable" or "disable".'}, status=status.HTTP_400_BAD_REQUEST)


class GenerateEmployeeQRView(APIView):
    """
    POST /api/employees/generate-qr/<employee_id>/
    Admin generates or regenerates permanent QR code for an employee.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    @transaction.atomic
    def post(self, request, pk):
        try:
            employee = Employee.objects.select_related('user').get(pk=pk)
        except Employee.DoesNotExist:
            return Response({'detail': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Delete old QR if exists
        EmployeeQR.objects.filter(employee=employee).delete()

        # Generate new QR
        _generate_employee_qr(employee)

        from audit_logs.models import AuditLog
        AuditLog.log(request.user, 'QR_GENERATE',
                     f"Generated QR for {employee.employee_code}", request)

        # Return the new QR URL
        employee.refresh_from_db()
        try:
            qr_url = request.build_absolute_uri(employee.qr_code.qr_image.url)
        except Exception:
            qr_url = None

        return Response({
            'detail': f'QR code generated for {employee.user.full_name}.',
            'qr_url': qr_url,
        })



class EmployeeViewSet(viewsets.ModelViewSet):
    """Employee management — Admin CRUD, Employee read-own."""
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee_code', 'user__first_name', 'user__last_name', 'designation']
    ordering_fields = ['employee_code', 'joining_date', 'basic_salary']

    def get_queryset(self):
        user = self.request.user
        qs = Employee.objects.select_related('user', 'department')
        if user.role == 'admin':
            return qs.all()
        # Employee can only see their own profile
        return qs.filter(user=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return EmployeeCreateSerializer
        if self.action in ['list']:
            return EmployeeListSerializer
        return EmployeeDetailSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        if self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create employee + user account in a single transaction."""
        serializer = EmployeeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Create user account
        user = User.objects.create_user(
            email=data['email'],
            password=data['password'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=User.EMPLOYEE,
        )

        # Get department (ORM - safe from SQL injection)
        department = Department.objects.get(id=data['department_id'])

        # Generate employee code
        employee_code = Employee.generate_employee_code()

        # Create employee profile
        employee = Employee.objects.create(
            user=user,
            employee_code=employee_code,
            department=department,
            designation=data['designation'],
            mobile=data['mobile'],
            joining_date=data['joining_date'],
            basic_salary=data['basic_salary'],
        )

        # Generate Employee QR
        qr_uuid = str(uuid.uuid4())
        qr_data = {
            "employee_id": employee.id,
            "employee_code": employee.employee_code,
            "uuid": qr_uuid
        }
        qr_json = json.dumps(qr_data, separators=(',', ':'))
        
        # Create signature
        secret = settings.SECRET_KEY.encode('utf-8')
        signature = hmac.new(secret, qr_json.encode('utf-8'), hashlib.sha256).hexdigest()
        
        # Add signature to data
        qr_data["signature"] = signature
        qr_final_json = json.dumps(qr_data, separators=(',', ':'))
        
        # Generate QR image
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(qr_final_json)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        
        # Save to DB
        emp_qr = EmployeeQR(employee=employee, qr_id=qr_uuid, signature=signature)
        emp_qr.qr_image.save(f"{employee.employee_code}_qr.png", ContentFile(buffer.getvalue()), save=True)

        # Audit log
        from audit_logs.models import AuditLog
        AuditLog.log(request.user, AuditLog.ACTION_EMPLOYEE_CREATE,
                     f"Created employee {employee_code}", request)

        return Response(
            EmployeeDetailSerializer(employee).data,
            status=status.HTTP_201_CREATED
        )
