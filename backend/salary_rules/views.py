from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdmin
from .models import SalaryGroup
from .serializers import SalaryGroupSerializer


class SalaryGroupViewSet(viewsets.ModelViewSet):
    queryset = SalaryGroup.objects.all()
    serializer_class = SalaryGroupSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
