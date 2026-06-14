from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, PendingRegistrationsView, ApproveRegistrationView, RejectRegistrationView, ToggleEmployeeStatusView, GenerateEmployeeQRView

router = DefaultRouter()
router.register(r'', EmployeeViewSet, basename='employee')

urlpatterns = [
    path('pending/', PendingRegistrationsView.as_view(), name='pending_registrations'),
    path('approve/<int:pk>/', ApproveRegistrationView.as_view(), name='approve_registration'),
    path('reject/<int:pk>/', RejectRegistrationView.as_view(), name='reject_registration'),
    path('toggle-status/<int:pk>/', ToggleEmployeeStatusView.as_view(), name='toggle_employee_status'),
    path('generate-qr/<int:pk>/', GenerateEmployeeQRView.as_view(), name='generate_employee_qr'),
    path('', include(router.urls)),
]
