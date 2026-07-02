from decimal import Decimal
from datetime import datetime, time

from django.db import transaction
from django.utils import timezone

from apps.invoices.models import Invoice
from apps.orders.models import Order
from apps.payments.models import Payment, PaymentHistory


class PaymentService:
    @staticmethod
    def add_payment(
        *,
        order: Order,
        user,
        amount: Decimal,
        payment_method: str,
        payment_date,
    ) -> Payment:
        if amount <= Decimal("0"):
            raise ValueError("Payment amount must be greater than zero.")

        if amount > order.remaining_balance:
            raise ValueError("Payment amount cannot exceed the remaining balance.")

        with transaction.atomic():
            previous_paid = order.paid_amount
            new_paid = previous_paid + amount
            new_remaining = order.items_total - new_paid

            next_sequence = (
                order.payments.order_by("-sequence").values_list("sequence", flat=True).first()
                or 0
            ) + 1

            paid_at = timezone.make_aware(datetime.combine(payment_date, time.min))

            payment = Payment.objects.create(
                order=order,
                sequence=next_sequence,
                amount=amount,
                payment_method=payment_method,
                payment_type=order.payment_type,
                recorded_by=user,
                paid_at=paid_at,
            )

            order.paid_amount = new_paid
            order.remaining_balance = new_remaining
            order.save(update_fields=["paid_amount", "remaining_balance", "updated_at"])

            if hasattr(order, "invoice"):
                invoice = order.invoice
                invoice.paid = new_paid
                invoice.remaining_balance = new_remaining
                invoice.save(update_fields=["paid", "remaining_balance", "updated_at"])

            PaymentHistory.objects.create(
                order=order,
                payment=payment,
                action=PaymentHistory.ACTION_CREATED,
                previous_paid_amount=previous_paid,
                new_paid_amount=new_paid,
                change_amount=amount,
                note=f"Payment of {amount} AWG recorded.",
                changed_by=user,
            )

        return payment
