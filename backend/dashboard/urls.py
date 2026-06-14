from django.urls import path
from . import views

urlpatterns = [
    path('admin/', views.admin_dashboard),
    path('employee/', views.employee_dashboard),
]
