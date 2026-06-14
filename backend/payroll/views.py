from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdmin
from employees.models import Employee
from .models import Payroll
from .calculator import calculate_payroll
from .serializers import PayrollSerializer


class PayrollViewSet(viewsets.ReadOnlyModelViewSet):
    """Payroll — Admin generates. Both can view."""
    serializer_class = PayrollSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Payroll.objects.select_related('employee__user', 'employee__department')
        if user.role == 'admin':
            month = self.request.query_params.get('month')
            year = self.request.query_params.get('year')
            if month:
                qs = qs.filter(month=month)
            if year:
                qs = qs.filter(year=year)
            return qs
        return qs.filter(employee__user=user)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def generate(self, request):
        """Generate payroll for all active employees for a given month/year."""
        month = request.data.get('month')
        year = request.data.get('year')

        if not month or not year:
            return Response({'detail': 'month and year are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            month = int(month)
            year = int(year)
        except (ValueError, TypeError):
            return Response({'detail': 'Invalid month or year.'}, status=status.HTTP_400_BAD_REQUEST)

        if not (1 <= month <= 12) or year < 2000:
            return Response({'detail': 'Invalid month or year range.'}, status=status.HTTP_400_BAD_REQUEST)

        employees = Employee.objects.filter(employment_status='active')
        results = []

        for employee in employees:
            try:
                payroll = calculate_payroll(employee, month, year)
                results.append({
                    'employee_code': employee.employee_code,
                    'employee_name': employee.user.full_name,
                    'net_salary': str(payroll.net_salary),
                    'status': 'success',
                })
            except Exception as e:
                results.append({
                    'employee_code': employee.employee_code,
                    'status': 'failed',
                })

        from audit_logs.models import AuditLog
        AuditLog.log(request.user, AuditLog.ACTION_PAYROLL,
                     f"Generated payroll for {month}/{year}", request)

        return Response({'results': results, 'total': len(results)})
