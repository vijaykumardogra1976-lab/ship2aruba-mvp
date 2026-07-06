"""
Client authentication views — separate from staff auth.

Endpoints:
  POST /api/client/auth/signup/    — Client signup
  POST /api/client/auth/login/     — Client login
  GET  /api/client/auth/me/        — Current client info
"""

import logging

from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import UserRole
from apps.customers.models import Customer
from apps.authentication.serializers import UserSerializer

logger = logging.getLogger("apps.authentication")
User = get_user_model()


def _issue_tokens(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


class ClientSignupView(APIView):
    """
    Client Signup.
    Body: { "name": "...", "email": "...", "phone": "...", "password": "..." }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        name = (request.data.get("name") or "").strip()
        email = (request.data.get("email") or "").strip().lower()
        phone = (request.data.get("phone") or "").strip()
        password = request.data.get("password", "")

        if not name or not password or (not email and not phone):
            return Response(
                {"detail": "Name, password, and at least one of email or phone are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create user_email
        user_email = email or f"customer_{phone}@ship2aruba.internal"

        # Ensure email isn't already used by another User
        if User.objects.filter(email=user_email).exists():
            # If the user already has a password, they should sign in
            existing_user = User.objects.get(email=user_email)
            if existing_user.has_usable_password():
                return Response(
                    {"detail": "An account with this email or phone number already exists. Please log in."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                # User exists but no password (e.g. staff created them). Just set the password.
                existing_user.set_password(password)
                existing_user.role = UserRole.CUSTOMER
                existing_user.save()
                tokens = _issue_tokens(existing_user)
                return Response({
                    **tokens,
                    "user": UserSerializer(existing_user).data
                }, status=status.HTTP_200_OK)

        # Create new User
        first_name = name.split()[0] if name else ""
        last_name = " ".join(name.split()[1:]) if len(name.split()) > 1 else ""

        user = User.objects.create_user(
            email=user_email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=UserRole.CUSTOMER,
        )

        # Find or create matching Customer profile
        customer = None
        if email:
            customer = Customer.objects.filter(email__iexact=email).first()
        if not customer and phone:
            customer = Customer.objects.filter(phone=phone).first()

        if customer:
            customer.user = user
            if not customer.name:
                customer.name = name
            if not customer.email and email:
                customer.email = email
            if not customer.phone and phone:
                customer.phone = phone
            customer.save()
        else:
            Customer.objects.create(
                user=user,
                name=name,
                email=email,
                phone=phone
            )

        tokens = _issue_tokens(user)
        return Response({
            **tokens,
            "user": UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class ClientLoginView(APIView):
    """
    Client Login.
    Body: { "identifier": "user@example.com or +12345", "password": "..." }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = (request.data.get("identifier") or "").strip().lower()
        password = request.data.get("password", "")

        if not identifier or not password:
            return Response(
                {"detail": "Identifier and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = None
        
        # Check if identifier is an email
        if "@" in identifier:
            user = authenticate(request, username=identifier, password=password)
        else:
            # Identifier might be a phone number. Let's find the Customer.
            customer = Customer.objects.filter(phone=identifier).first()
            if customer and customer.user:
                user = authenticate(request, username=customer.user.email, password=password)

        if not user:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            
        if not user.is_active:
            return Response(
                {"detail": "Account is disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Restrict login to customer role only
        if user.role != UserRole.CUSTOMER:
            return Response(
                {"detail": "Access denied. This portal is only for customers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        tokens = _issue_tokens(user)
        return Response({
            **tokens,
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)


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
            "email": user.email if not "ship2aruba.internal" in user.email else "",
            "name": customer.name if customer else user.full_name,
            "phone": customer.phone if customer else "",
            "role": user.role,
        })
