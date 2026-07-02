"""
OTP Service — orchestrates OTP generation, storage, and delivery.

Responsibilities:
  - Generate cryptographically secure 6-digit codes
  - Hash and store in DB (never plaintext)
  - Delegate delivery to the configured OTPDeliveryBackend
  - Verify OTP on login attempt

Usage:
    customer, created = OTPService.request(identifier="user@example.com")
    customer = OTPService.verify(identifier="user@example.com", code="482910")
"""

import hashlib
import logging
import secrets
from datetime import timedelta

from django.utils import timezone

from apps.authentication.models import ClientOTP, IdentifierType
from apps.authentication.otp_backends import get_otp_backend

logger = logging.getLogger("apps.authentication")

OTP_EXPIRY_MINUTES = 10
OTP_RATE_LIMIT_SECONDS = 60  # prevent spam — one OTP per minute per identifier


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


class OTPService:
    @staticmethod
    def _resolve_customer(identifier: str):
        """
        Find customer by email or phone.
        Returns (customer, identifier_type) or raises ValueError.
        """
        from apps.customers.models import Customer

        # Try email first
        customer = Customer.objects.filter(email__iexact=identifier).first()
        if customer:
            return customer, IdentifierType.EMAIL

        # Try phone (strip spaces for comparison)
        for c in Customer.objects.all():
            if c.phone.replace(" ", "") == identifier.replace(" ", ""):
                return c, IdentifierType.PHONE

        raise ValueError("No customer found with this email or phone number.")

    @staticmethod
    def request(identifier: str) -> tuple:
        """
        Generate OTP for the given identifier (email or phone).
        Returns (customer, identifier_type).
        Raises ValueError if customer not found or rate-limited.
        """
        customer, id_type = OTPService._resolve_customer(identifier)

        # Rate limit: block if OTP sent within last 60 seconds
        recent = ClientOTP.objects.filter(
            customer=customer,
            identifier=identifier,
            created_at__gte=timezone.now() - timedelta(seconds=OTP_RATE_LIMIT_SECONDS),
            is_used=False,
        ).first()
        if recent:
            seconds_left = OTP_RATE_LIMIT_SECONDS - int(
                (timezone.now() - recent.created_at).total_seconds()
            )
            raise ValueError(f"Please wait {seconds_left}s before requesting a new OTP.")

        # Invalidate old OTPs for this identifier
        ClientOTP.objects.filter(
            customer=customer, identifier=identifier, is_used=False
        ).update(is_used=True)

        # Generate new code
        code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
        expires_at = timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)

        ClientOTP.objects.create(
            customer=customer,
            identifier=identifier,
            identifier_type=id_type,
            code_hash=_hash_code(code),
            expires_at=expires_at,
        )

        # Deliver via configured backend
        backend = get_otp_backend()
        # For phone-type, delivery goes to customer email (MVP fallback)
        delivery_target = identifier if id_type == IdentifierType.EMAIL else (customer.email or identifier)
        backend.send(delivery_target, code, customer.name)

        logger.info("OTP sent for customer %s via %s", customer.id, id_type)
        return customer, id_type

    @staticmethod
    def verify(identifier: str, code: str):
        """
        Verify OTP. Returns Customer on success, raises ValueError on failure.
        """
        otp = (
            ClientOTP.objects.filter(
                identifier=identifier,
                code_hash=_hash_code(code),
                is_used=False,
            )
            .select_related("customer")
            .order_by("-created_at")
            .first()
        )

        if not otp:
            raise ValueError("Invalid OTP code.")

        if not otp.is_valid():
            raise ValueError("OTP has expired. Please request a new one.")

        otp.is_used = True
        otp.save(update_fields=["is_used"])

        logger.info("OTP verified for customer %s", otp.customer.id)
        return otp.customer
