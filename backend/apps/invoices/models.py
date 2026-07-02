from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel


class Invoice(TimeStampedModel):
    invoice_number = models.CharField(max_length=50, unique=True)
    order = models.OneToOneField(
        "orders.Order", on_delete=models.CASCADE, related_name="invoice"
    )
    company_name = models.CharField(max_length=255)
    company_address = models.CharField(max_length=500)
    company_phone = models.CharField(max_length=50)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    paid = models.DecimalField(max_digits=12, decimal_places=2)
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2)
    issued_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "invoices"

    def __str__(self):
        return self.invoice_number
