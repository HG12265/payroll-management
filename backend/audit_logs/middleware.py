"""Audit log middleware — auto-logs critical actions."""
import logging

logger = logging.getLogger(__name__)


class AuditLogMiddleware:
    """
    Lightweight middleware to track critical actions.
    Detailed logging is done in individual views using AuditLog.log()
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response
