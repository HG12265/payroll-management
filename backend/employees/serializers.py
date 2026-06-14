from rest_framework import serializers
from accounts.serializers import UserSerializer
from departments.serializers import DepartmentSerializer
from .models import Employee


class EmployeeListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    full_name = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Employee
        fields = ['id', 'employee_code', 'full_name', 'email', 'department_name',
                  'designation', 'employment_status', 'basic_salary']

    def get_full_name(self, obj):
        return obj.user.full_name


class EmployeeDetailSerializer(serializers.ModelSerializer):
    """Full employee detail including user info."""
    user = UserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.IntegerField(write_only=True)
    qr_code_url = serializers.SerializerMethodField()
    
    # Write-only fields to allow editing related User credentials
    email = serializers.EmailField(write_only=True, required=False)
    first_name = serializers.CharField(write_only=True, required=False, max_length=100)
    last_name = serializers.CharField(write_only=True, required=False, max_length=100)
    password = serializers.CharField(write_only=True, required=False, min_length=8, allow_blank=True)

    class Meta:
        model = Employee
        fields = [
            'id', 'employee_code', 'user', 'department', 'department_id',
            'designation', 'mobile', 'joining_date', 'employment_status',
            'basic_salary', 'profile_picture', 'created_at', 'qr_code_url',
            'email', 'first_name', 'last_name', 'password'
        ]
        read_only_fields = ['id', 'employee_code', 'created_at', 'qr_code_url']

    def get_qr_code_url(self, obj):
        try:
            qr_record = getattr(obj, 'qr_code', None)
            if qr_record:
                import qrcode
                import base64
                from io import BytesIO
                import json
                
                qr_data = {
                    "employee_id": obj.id,
                    "employee_code": obj.employee_code,
                    "uuid": str(qr_record.qr_id)
                }
                # Create exact verification string without signature
                qr_json = json.dumps(qr_data, separators=(',', ':'))
                qr_data["signature"] = qr_record.signature
                qr_final_json = json.dumps(qr_data, separators=(',', ':'))
                
                qr = qrcode.QRCode(version=1, box_size=10, border=4)
                qr.add_data(qr_final_json)
                qr.make(fit=True)
                img = qr.make_image(fill_color="black", back_color="white")
                
                buffer = BytesIO()
                img.save(buffer, format="PNG")
                img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
                return f"data:image/png;base64,{img_str}"
        except Exception:
            pass
        return None

    def update(self, instance, validated_data):
        from django.db import transaction
        from accounts.models import User
        from departments.models import Department

        email = validated_data.pop('email', None)
        first_name = validated_data.pop('first_name', None)
        last_name = validated_data.pop('last_name', None)
        password = validated_data.pop('password', None)
        department_id = validated_data.pop('department_id', None)

        with transaction.atomic():
            # Update user account
            user = instance.user
            user_changed = False

            if email is not None:
                email_lower = email.lower().strip()
                if User.objects.exclude(id=user.id).filter(email=email_lower).exists():
                    raise serializers.ValidationError({'email': 'An account with this email already exists.'})
                user.email = email_lower
                user_changed = True
            if first_name is not None:
                user.first_name = first_name
                user_changed = True
            if last_name is not None:
                user.last_name = last_name
                user_changed = True
            if password:
                user.set_password(password)
                user_changed = True

            if user_changed:
                user.save()

            # Update department
            if department_id is not None:
                try:
                    instance.department = Department.objects.get(id=department_id)
                except Department.DoesNotExist:
                    raise serializers.ValidationError({'department_id': 'Department not found.'})

            # Update other employee attributes
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            
            instance.save()
            
        return instance


class EmployeeCreateSerializer(serializers.Serializer):
    """
    Create employee + user account together.
    Admin provides basic details; system generates employee code.
    """
    # User fields
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    password = serializers.CharField(write_only=True, min_length=8)

    # Employee fields
    department_id = serializers.IntegerField()
    designation = serializers.CharField(max_length=100)
    mobile = serializers.CharField(max_length=15)
    joining_date = serializers.DateField()
    basic_salary = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_email(self, value):
        from accounts.models import User
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        validate_password(value)
        return value
