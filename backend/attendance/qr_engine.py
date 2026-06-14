"""
QR Attendance Engine.
- Generates session with UUID token and 60s expiry
- Ensures only one active QR at a time
- Validates on scan (check-in / check-out)
"""
import uuid
from datetime import timedelta
from django.utils import timezone
from .models import QRSession


def generate_qr_session():
    """
    Generate a new QR session.
    Invalidates any existing active QR first (single active QR rule).
    Returns: QRSession instance
    """
    # Invalidate all existing active QR sessions
    QRSession.objects.filter(is_active=True).update(is_active=False)

    # Create new session with 60 second expiry
    session = QRSession.objects.create(
        session_id=uuid.uuid4(),
        token=uuid.uuid4(),
        expiry_time=timezone.now() + timedelta(seconds=60),
        date=timezone.localdate(),
    )
    return session


def validate_qr_token(token_str):
    """
    Validate a scanned QR token.
    Returns: (QRSession, error_message) — error is None on success
    """
    try:
        token = uuid.UUID(str(token_str))
    except ValueError:
        return None, "Invalid QR code format."

    try:
        session = QRSession.objects.get(token=token, is_active=True)
    except QRSession.DoesNotExist:
        return None, "QR code not found or already used."

    if not session.is_valid():
        session.invalidate()
        return None, "QR code has expired. Please scan the latest QR."

    return session, None


def get_active_qr():
    """Get currently active QR session if any."""
    return QRSession.objects.filter(
        is_active=True,
        expiry_time__gt=timezone.now()
    ).first()
