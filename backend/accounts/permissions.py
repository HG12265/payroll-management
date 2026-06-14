"""
Permission classes — Role-Based Access Control (RBAC).
Server-side enforcement only. Never trust client-side data.
"""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Only Admin role can access this endpoint."""
    message = 'Admin access required.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )


class IsEmployee(BasePermission):
    """Only Employee role can access this endpoint."""
    message = 'Employee access required.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'employee'
        )


class IsAdminOrOwner(BasePermission):
    """Admin can access all. Employee can only access their own resources."""
    message = 'Access denied.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        # Employee can only access their own data
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'employee') and hasattr(obj.employee, 'user'):
            return obj.employee.user == request.user
        return False
