from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.common.enums import PaymentMethod, PaymentType
from apps.common.models import TimeStampedModel


class Payment(TimeStampedModel):
    order = models.ForeignKey(
        "orders.Order", on_delete=models.CASCADE, related_name="payments"
    )
    sequence = models.PositiveSmallIntegerField(default=1)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.CHOICES)
    payment_type = models.CharField(max_length=10, choices=PaymentType.CHOICES)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    paid_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "payments"
        ordering = ["sequence"]


class PaymentHistory(TimeStampedModel):
    ACTION_CREATED = "created"
    ACTION_UPDATED = "updated"
    ACTION_CHOICES = [
        (ACTION_CREATED, "Created"),
        (ACTION_UPDATED, "Updated"),
    ]

    order = models.ForeignKey(
        "orders.Order", on_delete=models.CASCADE, related_name="payment_history"
    )
    payment = models.ForeignKey(
        Payment, on_delete=models.SET_NULL, null=True, blank=True
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    previous_paid_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    new_paid_amount = models.DecimalField(max_digits=12, decimal_places=2)
    change_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    note = models.TextField(blank=True, default="")
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )

    class Meta:
        db_table = "payment_history"
        ordering = ["-created_at"]
