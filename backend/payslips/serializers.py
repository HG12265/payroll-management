from rest_framework import serializers
from .models import Payslip


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.SerializerMethodField()
    month = serializers.IntegerField(source='payroll.month', read_only=True)
    year = serializers.IntegerField(source='payroll.year', read_only=True)
    net_salary = serializers.DecimalField(source='payroll.net_salary', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Payslip
        fields = ['id', 'payslip_number', 'employee_name', 'employee_code',
                  'month', 'year', 'net_salary', 'email_sent', 'email_sent_at', 'generated_at']

    def get_employee_name(self, obj):
        return obj.payroll.employee.user.full_name

    def get_employee_code(self, obj):
        return obj.payroll.employee.employee_code
