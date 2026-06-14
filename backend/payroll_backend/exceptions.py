"""
Custom exception handler — never expose internal errors to clients.
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        return response

    # Log the real error securely (server side only)
    logger.error(f"Unhandled exception: {type(exc).__name__}", exc_info=exc)

    # Return generic error to client (never expose internals)
    return Response(
        {'detail': 'An internal server error occurred. Please try again later.'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
