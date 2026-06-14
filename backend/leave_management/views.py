from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdmin
from .models import Leave
from .serializers import LeaveSerializer


class LeaveViewSet(viewsets.ModelViewSet):
    """Leave management — Employee applies, Admin approves/rejects."""
    serializer_class = LeaveSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Leave.objects.select_related('employee__user', 'approved_by')
        if user.role == 'admin':
            status_filter = self.request.query_params.get('status')
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs
        return qs.filter(employee__user=user)

    def perform_create(self, serializer):
        employee = self.request.user.employee_profile
        serializer.save(employee=employee, status=Leave.STATUS_PENDING)

    def get_permissions(self):
        if self.action in ['destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def approve(self, request, pk=None):
        leave = self.get_object()
        if leave.status != Leave.STATUS_PENDING:
            return Response({'detail': 'Only pending leaves can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        leave.status = Leave.STATUS_APPROVED
        leave.approved_by = request.user
        leave.save()
        return Response({'detail': 'Leave approved successfully.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def reject(self, request, pk=None):
        leave = self.get_object()
        if leave.status != Leave.STATUS_PENDING:
            return Response({'detail': 'Only pending leaves can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        rejection_reason = request.data.get('rejection_reason', '')
        leave.status = Leave.STATUS_REJECTED
        leave.approved_by = request.user
        leave.rejection_reason = rejection_reason
        leave.save()
        return Response({'detail': 'Leave rejected.'})
