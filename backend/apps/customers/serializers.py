from rest_framework import serializers

from apps.customers.models import Customer

CUSTOMER_NAME_MAX_LENGTH = 20


class CustomerSerializer(serializers.ModelSerializer):
    orders_count = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ("id", "name", "phone", "email", "created_at", "orders_count")
        read_only_fields = ("id", "created_at", "orders_count")

    def get_orders_count(self, obj):
        annotated_count = getattr(obj, "orders_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.orders.count()



class CustomerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("name", "phone", "email")

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name is required.")
        if len(value) > CUSTOMER_NAME_MAX_LENGTH:
            raise serializers.ValidationError(
                f"Name must be {CUSTOMER_NAME_MAX_LENGTH} characters or less."
            )
        return value

    def validate_phone(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Phone number is required.")
        return value.strip()

    def validate_email(self, value):
        if value == "":
            return None
        return value
