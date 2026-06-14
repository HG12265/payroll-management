from rest_framework import serializers
from .models import Payroll


class PayrollSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()

    class Meta:
        model = Payroll
        fields = [
            'id', 'employee', 'employee_name', 'employee_code', 'department',
            'month', 'year', 'total_working_days', 'present_days',
            'basic_salary', 'hra', 'da', 'medical_allowance', 'travel_allowance', 'bonus',
            'gross_salary', 'pf_deduction', 'esi_deduction', 'pt_deduction', 'tds_deduction',
            'total_deductions', 'net_salary', 'status', 'processed_at',
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return obj.employee.user.full_name

    def get_employee_code(self, obj):
        return obj.employee.employee_code

    def get_department(self, obj):
        return obj.employee.department.department_name
