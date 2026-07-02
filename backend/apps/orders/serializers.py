from decimal import Decimal

from rest_framework import serializers

from apps.common.enums import PaymentMethod, PaymentType, WebsiteType
from apps.customers.models import Customer
from apps.customers.serializers import CustomerSerializer
from apps.invoices.models import Invoice
from apps.orders.models import Order, OrderDocument, OrderItem
from apps.payments.models import Payment, PaymentHistory


class InvoiceBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ("id", "invoice_number")


class OrderCreateSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField()
    website_type = serializers.ChoiceField(choices=WebsiteType.CHOICES)
    website = serializers.CharField(max_length=255)
    order_date = serializers.DateField()
    number_of_items = serializers.IntegerField(min_value=1)
    amount_usd = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    payment_type = serializers.ChoiceField(choices=PaymentType.CHOICES)
    payment_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"))
    items_total = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"))
    payment_method = serializers.ChoiceField(choices=PaymentMethod.CHOICES)
    is_new_client = serializers.BooleanField(default=False)
    is_urgent = serializers.BooleanField(default=False)
    internal_notes = serializers.CharField(required=False, allow_blank=True, default="")
    client_notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_customer_id(self, value):
        if not Customer.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Customer not found.")
        return value

    def validate(self, attrs):
        if attrs["paid_amount"] > attrs["items_total"]:
            raise serializers.ValidationError(
                {"paid_amount": "Paid amount cannot exceed items total."}
            )
        return attrs


class OrderDetailSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    invoice = InvoiceBriefSerializer(read_only=True)
    remaining_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "customer",
            "website_type",
            "website",
            "order_date",
            "number_of_items",
            "amount_usd",
            "payment_type",
            "payment_amount",
            "items_total",
            "paid_amount",
            "remaining_balance",
            "payment_method",
            "is_new_client",
            "is_urgent",
            "internal_notes",
            "client_notes",
            "current_status",
            "is_az_ordered",
            "is_uploaded",
            "is_in_myus",
            "is_completed",
            "invoice",
            "created_at",
        )


class OrderListSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    placed_by = serializers.SerializerMethodField()
    has_pdf = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()
    payment_type_display = serializers.SerializerMethodField()
    payment_method_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "customer",
            "order_date",
            "amount_usd",
            "items_total",
            "paid_amount",
            "remaining_balance",
            "number_of_items",
            "payment_amount",
            "payment_type",
            "payment_type_display",
            "payment_method",
            "payment_method_display",
            "internal_notes",
            "client_notes",
            "is_az_ordered",
            "is_uploaded",
            "is_in_myus",
            "is_completed",
            "has_pdf",
            "pdf_url",
            "placed_by",
            "created_at",
        )

    def get_placed_by(self, obj):
        if not obj.created_by:
            return None
        return {
            "id": obj.created_by_id,
            "full_name": obj.created_by.full_name,
        }

    def get_has_pdf(self, obj):
        return hasattr(obj, "document") and bool(obj.document.file)

    def get_pdf_url(self, obj):
        if hasattr(obj, "document") and obj.document.file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.document.file.url)
            return obj.document.file.url
        return None

    def get_payment_type_display(self, obj):
        return dict(PaymentType.CHOICES).get(obj.payment_type, obj.payment_type)

    def get_payment_method_display(self, obj):
        return dict(PaymentMethod.CHOICES).get(obj.payment_method, obj.payment_method)


class OrderStatusToggleSerializer(serializers.Serializer):
    is_az_ordered = serializers.BooleanField(required=False)
    is_uploaded = serializers.BooleanField(required=False)
    is_in_myus = serializers.BooleanField(required=False)
    is_completed = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("At least one status field is required.")
        return attrs


class OrderEditSerializer(serializers.Serializer):
    items_total = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0.01"), required=False
    )
    amount_usd = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0.01"), required=False
    )
    order_date = serializers.DateField(required=False)
    authorization_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        editable_fields = {"items_total", "amount_usd", "order_date"}
        if not editable_fields.intersection(attrs.keys()):
            raise serializers.ValidationError(
                "At least one editable field is required."
            )
        return attrs


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "id",
            "label",
            "quantity",
            "unit_price",
            "line_total",
            "tracking_number",
            "fedex_tracking_number",
            "image_url",
            "is_in_myus",
            "is_ready_for_pickup",
            "is_delivered",
            "est_date",
            "address",
            "notes",
            "account_used",
            "created_at",
        )


class OrderDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = OrderDocument
        fields = ("id", "file_url", "created_at")

    def get_file_url(self, obj):
        request = self.context.get("request")
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None


class PaymentSerializer(serializers.ModelSerializer):
    payment_method_display = serializers.SerializerMethodField()
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "id",
            "sequence",
            "amount",
            "payment_method",
            "payment_method_display",
            "payment_type",
            "paid_at",
            "recorded_by_name",
            "created_at",
        )

    def get_payment_method_display(self, obj):
        return dict(PaymentMethod.CHOICES).get(obj.payment_method, obj.payment_method)

    def get_recorded_by_name(self, obj):
        return obj.recorded_by.full_name if obj.recorded_by else None


class PaymentHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PaymentHistory
        fields = (
            "id",
            "action",
            "previous_paid_amount",
            "new_paid_amount",
            "change_amount",
            "note",
            "changed_by_name",
            "created_at",
        )

    def get_changed_by_name(self, obj):
        return obj.changed_by.full_name if obj.changed_by else None


class PaymentCreateSerializer(serializers.Serializer):
    payment_date = serializers.DateField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    payment_method = serializers.ChoiceField(choices=PaymentMethod.CHOICES)
