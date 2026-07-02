from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel


class UserRole(models.TextChoices):
    ADMIN = "admin", "Admin"
    STAFF = "staff", "Staff"
    CUSTOMER = "customer", "Customer"


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(
        max_length=20, choices=UserRole.choices, default=UserRole.STAFF
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email


class IdentifierType(models.TextChoices):
    EMAIL = "email", "Email"
    PHONE = "phone", "Phone"


class ClientOTP(models.Model):
    """
    OTP tokens for client (customer) login.

    Designed for extensibility:
    - identifier_type lets us support SMS in future without schema changes.
    - Delivery is handled by a pluggable OTPDeliveryBackend (see otp_backends.py).
    - OTP codes are stored hashed — never in plaintext.
    """

    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.CASCADE,
        related_name="otps",
    )
    identifier = models.CharField(max_length=255)          # email or phone value
    identifier_type = models.CharField(
        max_length=10, choices=IdentifierType.choices, default=IdentifierType.EMAIL
    )
    code_hash = models.CharField(max_length=128)           # SHA-256 hash of the code
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "client_otps"
        ordering = ["-created_at"]

    def is_valid(self) -> bool:
        return not self.is_used and self.expires_at > timezone.now()

    def __str__(self):
        return f"OTP for {self.identifier} ({'used' if self.is_used else 'active'})"
