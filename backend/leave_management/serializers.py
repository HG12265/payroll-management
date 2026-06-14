from rest_framework import serializers
from .models import Leave


class LeaveSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Leave
        fields = ['id', 'employee', 'employee_name', 'employee_code',
                  'leave_type', 'from_date', 'to_date', 'number_of_days',
                  'reason', 'status', 'approved_by', 'approved_by_name',
                  'rejection_reason', 'applied_on']
        read_only_fields = ['id', 'applied_on', 'approved_by']

    def get_employee_name(self, obj):
        return obj.employee.user.full_name

    def get_employee_code(self, obj):
        return obj.employee.employee_code

    def get_approved_by_name(self, obj):
        return obj.approved_by.full_name if obj.approved_by else None
