"""
Accounts serializers — input validation, password strength checking.
"""
import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Read-only user profile serializer — no sensitive fields."""
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'role', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at', 'role']


class ProfileSerializer(serializers.ModelSerializer):
    """Full profile including employee_profile + QR code URL."""
    full_name = serializers.ReadOnlyField()
    employee_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'role', 'is_active', 'created_at', 'employee_profile']
        read_only_fields = ['id', 'created_at', 'role']

    def get_employee_profile(self, obj):
        try:
            emp = obj.employee_profile
        except Exception:
            return None
        
        qr_url = None
        try:
            qr_record = getattr(emp, 'qr_code', None)
            if qr_record:
                import qrcode
                import base64
                from io import BytesIO
                import json
                
                qr_data = {
                    "employee_id": emp.id,
                    "employee_code": emp.employee_code,
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
                qr_url = f"data:image/png;base64,{img_str}"
        except Exception:
            pass

        return {
            'id': emp.id,
            'employee_code': emp.employee_code,
            'department': {'id': emp.department.id, 'department_name': emp.department.department_name} if emp.department else None,
            'designation': emp.designation,
            'mobile': emp.mobile,
            'joining_date': str(emp.joining_date) if emp.joining_date else None,
            'employment_status': emp.employment_status,
            'basic_salary': str(emp.basic_salary),
            'qr_code_url': qr_url,
        }


class LoginSerializer(serializers.Serializer):
    """Login serializer — validates credentials."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate_email(self, value):
        return value.lower().strip()


class ChangePasswordSerializer(serializers.Serializer):
    """Password change serializer with strength validation."""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        # Minimum length: 8 characters, allow all chars
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters.')
        if len(value) > 128:
            raise serializers.ValidationError('Password must not exceed 128 characters.')
        validate_password(value)
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return data


class UserCreateSerializer(serializers.ModelSerializer):
    """Admin creates employees — password auto-generated and emailed."""
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'role', 'password']

    def validate_email(self, value):
        return value.lower().strip()

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user
