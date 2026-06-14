from django.urls import path
from rest_framework.generics import ListAPIView
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdmin
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_email', 'action', 'details', 'ip_address', 'timestamp']

    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'System'


class AuditLogListView(ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = AuditLog.objects.select_related('user').all()


urlpatterns = [
    path('', AuditLogListView.as_view(), name='audit_logs'),
]
