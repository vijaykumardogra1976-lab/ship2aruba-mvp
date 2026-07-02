from django.contrib import admin

from apps.invoices.models import Invoice
from apps.orders.models import Order, OrderItem, OrderStatusHistory
from apps.payments.models import Payment, PaymentHistory


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "customer", "current_status", "items_total", "created_at")
    search_fields = ("order_number", "customer__name")
    list_filter = ("current_status", "payment_type", "payment_method")


admin.site.register(OrderItem)
admin.site.register(OrderStatusHistory)
admin.site.register(Payment)
admin.site.register(PaymentHistory)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "order", "total", "remaining_balance", "issued_at")
