from rest_framework import serializers
from .models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'department_code', 'department_name', 'description', 'status', 'employee_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_employee_count(self, obj):
        return obj.employees.filter(employment_status='active').count()

    def validate_department_code(self, value):
        return value.upper().strip()
