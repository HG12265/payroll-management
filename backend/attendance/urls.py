from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QRScanView, AttendanceViewSet

router = DefaultRouter()
router.register(r'records', AttendanceViewSet, basename='attendance')

urlpatterns = [
    path('qr/scan/', QRScanView.as_view(), name='qr_scan'),
    path('', include(router.urls)),
]
