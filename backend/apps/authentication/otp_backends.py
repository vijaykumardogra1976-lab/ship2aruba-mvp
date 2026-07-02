"""
OTP Delivery Backends — Strategy Pattern.

To add a new delivery channel (e.g. SMS via Twilio):
1. Create a new class inheriting OTPDeliveryBackend
2. Implement the `send(identifier, code, customer)` method
3. Update OTP_DELIVERY_BACKEND in settings.py

No other code needs to change.
"""

import logging
from abc import ABC, abstractmethod

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger("apps.authentication")


class OTPDeliveryBackend(ABC):
    """Abstract base — all delivery backends must implement this."""

    @abstractmethod
    def send(self, identifier: str, code: str, customer_name: str) -> bool:
        """Send OTP to the given identifier. Returns True on success."""
        ...


class EmailOTPBackend(OTPDeliveryBackend):
    """
    Delivers OTP via email.
    MVP default — works with existing SMTP setup.
    """

    def send(self, identifier: str, code: str, customer_name: str) -> bool:
        formatted_code = f"{code[:3]} {code[3:]}"  # "482910" → "482 910"
        subject = f"Your Ship2Aruba login code: {code}"
        message = (
            f"Hello {customer_name},\n\n"
            f"Your one-time login code is:\n\n"
            f"    {formatted_code}\n\n"
            f"This code expires in 10 minutes. Do not share it with anyone.\n\n"
            f"If you did not request this, please ignore this email.\n\n"
            f"— Ship2Aruba Team"
        )
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[identifier],
                fail_silently=False,
            )
            logger.info("OTP email sent to %s", identifier)
            return True
        except Exception:
            logger.exception("Failed to send OTP email to %s", identifier)
            return False


class SmsOTPBackend(OTPDeliveryBackend):
    """
    Delivers OTP via SMS (Twilio).
    Future implementation — plug in when Twilio is ready.

    Required settings:
        TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
    """

    def send(self, identifier: str, code: str, customer_name: str) -> bool:
        # Future: uncomment when Twilio credentials are available
        # from twilio.rest import Client
        # client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        # client.messages.create(
        #     body=f"Your Ship2Aruba code: {code}. Expires in 10 mins.",
        #     from_=settings.TWILIO_FROM_NUMBER,
        #     to=identifier,
        # )
        raise NotImplementedError("SmsOTPBackend: Twilio not yet configured.")


def get_otp_backend() -> OTPDeliveryBackend:
    """
    Load the configured OTP delivery backend.
    Controlled by settings.OTP_DELIVERY_BACKEND.
    Default: EmailOTPBackend
    """
    backend_path = getattr(
        settings,
        "OTP_DELIVERY_BACKEND",
        "apps.authentication.otp_backends.EmailOTPBackend",
    )
    module_path, class_name = backend_path.rsplit(".", 1)
    import importlib
    module = importlib.import_module(module_path)
    return getattr(module, class_name)()
