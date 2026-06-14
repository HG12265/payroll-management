from rest_framework import serializers
from .models import Attendance


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = ['id', 'employee', 'employee_name', 'employee_code',
                  'attendance_date', 'check_in_time', 'check_out_time',
                  'working_hours', 'attendance_status', 'is_manual', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_employee_name(self, obj):
        return obj.employee.user.full_name

    def get_employee_code(self, obj):
        return obj.employee.employee_code

    def create(self, validated_data):
        validated_data['is_manual'] = True
        check_in = validated_data.get('check_in_time')
        check_out = validated_data.get('check_out_time')
        
        if 'working_hours' not in validated_data or validated_data.get('working_hours') is None:
            if check_in and check_out:
                from .rule_engine import calculate_working_hours
                validated_data['working_hours'] = calculate_working_hours(check_in, check_out)
            else:
                validated_data['working_hours'] = 0.00
                
        if 'attendance_status' not in validated_data or validated_data.get('attendance_status') is None:
            from .rule_engine import determine_attendance_status
            from decimal import Decimal
            working_hours = Decimal(str(validated_data.get('working_hours', 0.00)))
            validated_data['attendance_status'] = determine_attendance_status(check_in, working_hours)
            
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['is_manual'] = True
        check_in = validated_data.get('check_in_time', instance.check_in_time)
        check_out = validated_data.get('check_out_time', instance.check_out_time)
        
        if 'working_hours' not in validated_data or validated_data.get('working_hours') is None:
            if check_in and check_out:
                from .rule_engine import calculate_working_hours
                validated_data['working_hours'] = calculate_working_hours(check_in, check_out)
            else:
                validated_data['working_hours'] = 0.00
                
        if 'attendance_status' not in validated_data or validated_data.get('attendance_status') is None:
            from .rule_engine import determine_attendance_status
            from decimal import Decimal
            working_hours = Decimal(str(validated_data.get('working_hours', 0.00)))
            validated_data['attendance_status'] = determine_attendance_status(check_in, working_hours)
            
        return super().update(instance, validated_data)

