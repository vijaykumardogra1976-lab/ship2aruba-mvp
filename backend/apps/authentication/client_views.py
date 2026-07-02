"""
Client authentication views — separate from staff auth.

Endpoints:
  POST /api/client/auth/otp/request/   — request OTP
  POST /api/client/auth/otp/verify/    — verify OTP → JWT
  POST /api/client/auth/set-password/  — set password (first login)
  GET  /api/client/auth/me/            — current client info
"""

import logging

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import UserRole
from apps.authentication.otp_service import OTPService

logger = logging.getLogger("apps.authentication")
User = get_user_model()


def _issue_tokens(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


def _get_or_create_user_for_customer(customer) -> tuple[object, bool]:
    """
    Get or create a Django User linked to this Customer.
    Returns (user, is_new).
    """
    # If customer already linked to a user account
    if customer.user_id:
        return customer.user, False

    # Create new user account for this customer
    email = customer.email or f"customer_{customer.id}@ship2aruba.internal"
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "first_name": customer.name.split()[0] if customer.name else "",
            "last_name": " ".join(customer.name.split()[1:]) if len(customer.name.split()) > 1 else "",
            "role": UserRole.CUSTOMER,
            "is_active": True,
        },
    )
    if created:
        user.set_unusable_password()
        user.save(update_fields=["password"])

    # Link user to customer
    customer.user = user
    customer.save(update_fields=["user"])

    return user, created


class ClientOTPRequestView(APIView):
    """
    Step 1: Request OTP.
    Body: { "identifier": "user@example.com" }  (email or phone)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = (request.data.get("identifier") or "").strip()
        if not identifier:
            return Response(
                {"detail": "identifier (email or phone) is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            customer, id_type = OTPService.request(identifier)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Mask the identifier for privacy in response
        if id_type == "email":
            parts = identifier.split("@")
            masked = parts[0][:2] + "***@" + parts[1] if len(parts) == 2 else "***"
        else:
            masked = identifier[:3] + "***" + identifier[-2:]

        return Response({
            "detail": f"OTP sent to {masked}",
            "identifier_type": id_type,
            "masked_identifier": masked,
        })


class ClientOTPVerifyView(APIView):
    """
    Step 2: Verify OTP → issue JWT.
    Body: { "identifier": "...", "code": "482910" }
    Response: { access, refresh, is_first_login, customer_name }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = (request.data.get("identifier") or "").strip()
        code = (request.data.get("code") or "").strip()

        if not identifier or not code:
            return Response(
                {"detail": "identifier and code are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            customer = OTPService.verify(identifier, code)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        user, is_new = _get_or_create_user_for_customer(customer)

        if not user.is_active:
            return Response(
                {"detail": "Account is disabled. Please contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )

        tokens = _issue_tokens(user)
        return Response({
            **tokens,
            "is_first_login": is_new or not user.has_usable_password(),
            "customer_name": customer.name,
            "customer_id": customer.id,
        })


class ClientSetPasswordView(APIView):
    """
    Step 3 (first login only): Set password.
    Body: { "password": "...", "confirm_password": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != UserRole.CUSTOMER:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        password = request.data.get("password", "").strip()
        confirm = request.data.get("confirm_password", "").strip()

        if not password:
            return Response({"detail": "password is required."}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password != confirm:
            return Response({"detail": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(password)
        request.user.save(update_fields=["password"])

        return Response({"detail": "Password set successfully."})


class ClientMeView(APIView):
    """
    GET /api/client/auth/me/  — returns current client profile info.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != UserRole.CUSTOMER:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        user = request.user
        customer = user.customer_profile.first()

        return Response({
            "id": user.id,
            "email": user.email,
            "name": customer.name if customer else user.full_name,
            "phone": customer.phone if customer else "",
            "role": user.role,
        })
