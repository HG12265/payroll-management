"""
Authentication views for Staff Payroll Management System.
- Login returns JWT tokens
- No credentials in logs or URL parameters
- Rate limited login endpoint
"""
import logging
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenRefreshView

from .serializers import LoginSerializer, UserSerializer, ChangePasswordSerializer, ProfileSerializer
from .throttles import LoginRateThrottle

logger = logging.getLogger(__name__)
User = get_user_model()


class LoginView(APIView):
    """
    POST /api/auth/login/
    Rate limited. Returns JWT access + refresh tokens.
    NEVER log credentials.
    Blocks unapproved self-registered employees.
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        # NEVER log email or password
        user = authenticate(request, username=email, password=password)

        if user is None or not user.is_active:
            logger.warning(f"Failed login attempt for email hash: {hash(email)}")
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Block self-registered employees awaiting approval
        if user.role == User.EMPLOYEE and not user.is_approved:
            return Response(
                {'detail': 'Your account is pending admin approval. Please wait for confirmation.'},
                status=status.HTTP_403_FORBIDDEN
            )

        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['full_name'] = user.full_name

        logger.info(f"User logged in successfully (role: {user.role})")

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class SelfRegisterView(APIView):
    """
    POST /api/auth/register/
    Public endpoint. Creates a user account and registration request.
    Account is NOT approved until admin reviews it.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data

        email = data.get('email', '').strip().lower()
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        password = data.get('password', '')
        mobile = data.get('mobile', '').strip()
        joining_date = data.get('joining_date') or None
        notes = data.get('notes', '').strip()

        # Validation
        if not all([email, first_name, last_name, password, mobile]):
            return Response({'detail': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response({'detail': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'detail': 'An account with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create user — NOT approved, role is employee
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=User.EMPLOYEE,
            is_approved=False,
        )

        # Create registration request
        from employees.models import RegistrationRequest
        RegistrationRequest.objects.create(
            user=user,
            mobile=mobile,
            joining_date=joining_date,
            notes=notes,
        )

        return Response(
            {'detail': 'Registration submitted successfully! Your account is pending admin approval.'},
            status=status.HTTP_201_CREATED
        )


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the refresh token — invalidates session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({'detail': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
        except TokenError:
            return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET/PUT /api/auth/profile/
    Returns the authenticated user's full profile including employee QR code URL.
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserSerializer
        return ProfileSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        # Prevent role escalation
        request.data.pop('role', None)
        request.data.pop('is_staff', None)
        request.data.pop('is_superuser', None)
        return super().update(request, *args, **kwargs)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Allows authenticated user to change their own password.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({'detail': 'Password changed successfully. Please log in again.'})


from .permissions import IsAdmin

class CreateAdminView(APIView):
    """
    POST /api/auth/add-admin/
    Only admins can call this to create a new admin.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        data = request.data
        email = data.get('email', '').strip().lower()
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        password = data.get('password', '')

        if not all([email, first_name, last_name, password]):
            return Response({'detail': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response({'detail': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'detail': 'An account with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=User.ADMIN,
            is_staff=True,
            is_superuser=True,
            is_approved=True
        )

        return Response(
            {'detail': f'Admin account {email} created successfully.'},
            status=status.HTTP_201_CREATED
        )

