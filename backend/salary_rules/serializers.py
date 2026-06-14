from rest_framework import serializers
from .models import SalaryGroup


class SalaryGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryGroup
        fields = '__all__'
