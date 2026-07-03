from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.common.enums import OrderStatus as OrderStatusEnum
from apps.common.enums import PaymentMethod, PaymentType, WebsiteType
from apps.common.models import TimeStampedModel


class Order(TimeStampedModel):
    order_number = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.PROTECT,
        related_name="orders",
    )
    website_type = models.CharField(max_length=20, choices=WebsiteType.CHOICES)
    website = models.CharField(max_length=255)
    order_date = models.DateField()
    number_of_items = models.PositiveIntegerField()
    amount_usd = models.DecimalField(max_digits=12, decimal_places=2)
    payment_type = models.CharField(max_length=10, choices=PaymentType.CHOICES)
    payment_amount = models.DecimalField(max_digits=12, decimal_places=2)
    items_total = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2)
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.CHOICES)
    is_new_client = models.BooleanField(default=False)
    is_urgent = models.BooleanField(default=False)
    internal_notes = models.TextField(blank=True, default="")
    client_notes = models.TextField(blank=True, default="")
    current_status = models.CharField(
        max_length=30,
        choices=OrderStatusEnum.CHOICES,
        default=OrderStatusEnum.PENDING_APPROVAL,
    )
    is_az_ordered = models.BooleanField(default=False)
    is_uploaded = models.BooleanField(default=False)
    is_in_myus = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="orders_created",
    )

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number


class OrderItem(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    label = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    tracking_number = models.CharField(max_length=100, blank=True, default="")
    fedex_tracking_number = models.CharField(max_length=100, blank=True, default="")
    image_url = models.URLField(max_length=1000, blank=True, default="")
    product_image = models.ImageField(upload_to="order_items/", null=True, blank=True)
    is_in_myus = models.BooleanField(default=False)
    is_ready_for_pickup = models.BooleanField(default=False)
    is_delivered = models.BooleanField(default=False)
    est_date = models.DateField(null=True, blank=True)
    address = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    account_used = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "order_items"

    def __str__(self):
        return self.label


class OrderStatusHistory(TimeStampedModel):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="status_history"
    )
    status = models.CharField(max_length=30, choices=OrderStatusEnum.CHOICES)
    note = models.TextField(blank=True, default="")
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )

    class Meta:
        db_table = "order_status_history"
        ordering = ["created_at"]


def order_document_upload_path(instance, filename):
    return f"orders/{instance.order_id}/documents/{filename}"


class OrderDocument(TimeStampedModel):
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="document",
    )
    file = models.FileField(upload_to=order_document_upload_path)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="order_documents_uploaded",
    )

    class Meta:
        db_table = "order_documents"
