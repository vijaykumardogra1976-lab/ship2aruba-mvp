import logging
import threading
from decimal import Decimal

from django.conf import settings
from django.db import transaction

from apps.common.enums import OrderStatus as OrderStatusEnum
from apps.common.enums import PaymentType
from apps.customers.models import Customer
from apps.invoices.models import Invoice
from apps.notifications.services.notification_service import NotificationService
from apps.orders.models import Order, OrderItem, OrderStatusHistory
from apps.orders.utils import generate_invoice_number, generate_order_number
from apps.payments.models import Payment, PaymentHistory

logger = logging.getLogger(__name__)


class OrderService:
    @staticmethod
    def create_order(*, user, validated_data: dict) -> Order:
        customer = Customer.objects.get(pk=validated_data["customer_id"])
        total_paid = validated_data["paid_amount"] + validated_data["payment_amount"]
        remaining_balance = validated_data["items_total"] - total_paid

        with transaction.atomic():
            order = Order.objects.create(
                order_number=generate_order_number(),
                customer=customer,
                website_type=validated_data["website_type"],
                website=validated_data["website"],
                order_date=validated_data["order_date"],
                number_of_items=validated_data["number_of_items"],
                amount_usd=validated_data["amount_usd"],
                payment_type=validated_data["payment_type"],
                payment_amount=validated_data["payment_amount"],
                items_total=validated_data["items_total"],
                paid_amount=total_paid,
                remaining_balance=remaining_balance,
                payment_method=validated_data["payment_method"],
                is_new_client=validated_data.get("is_new_client", False),
                is_urgent=validated_data.get("is_urgent", False),
                internal_notes=validated_data.get("internal_notes", ""),
                client_notes=validated_data.get("client_notes", ""),
                current_status=OrderStatusEnum.PENDING_APPROVAL,
                created_by=user,
            )

            OrderItem.objects.create(
                order=order,
                label=f"Ship 2 Aruba Order ({order.number_of_items} Items)",
                quantity=1,
                unit_price=order.items_total,
                line_total=order.items_total,
            )

            payment = Payment.objects.create(
                order=order,
                sequence=1,
                amount=validated_data["payment_amount"],
                payment_method=order.payment_method,
                payment_type=order.payment_type,
                recorded_by=user,
            )

            PaymentHistory.objects.create(
                order=order,
                payment=payment,
                action=PaymentHistory.ACTION_CREATED,
                previous_paid_amount=Decimal("0.00"),
                new_paid_amount=order.paid_amount,
                change_amount=order.paid_amount,
                changed_by=user,
            )

            if order.payment_type == PaymentType.TWO:
                Payment.objects.create(
                    order=order,
                    sequence=2,
                    amount=order.payment_amount,
                    payment_method=order.payment_method,
                    payment_type=order.payment_type,
                    recorded_by=user,
                )

            OrderStatusHistory.objects.create(
                order=order,
                status=OrderStatusEnum.PENDING_APPROVAL,
                note="Order placed for approval.",
                changed_by=user,
            )

            Invoice.objects.create(
                invoice_number=generate_invoice_number(),
                order=order,
                company_name=settings.COMPANY_NAME,
                company_address=settings.COMPANY_ADDRESS,
                company_phone=settings.COMPANY_PHONE,
                subtotal=order.items_total,
                total=order.items_total,
                paid=order.paid_amount,
                remaining_balance=order.remaining_balance,
            )

            order_id = order.id

        order = Order.objects.select_related("customer", "invoice").get(pk=order_id)

        send_email = validated_data.get("send_email", True)
        if send_email:
            def _send_notification():
                try:
                    NotificationService.send_order_created(order_id)
                except Exception:
                    logger.exception("Background notification failed for order %s.", order_id)

            transaction.on_commit(
                lambda: threading.Thread(target=_send_notification, daemon=True).start()
            )

        return order
