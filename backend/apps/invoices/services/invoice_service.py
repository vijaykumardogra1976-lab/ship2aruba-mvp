from django.conf import settings
from django.template.loader import render_to_string

from apps.common.enums import PaymentMethod


class InvoiceService:
    @staticmethod
    def build_context(invoice) -> dict:
        order = invoice.order
        customer = order.customer
        payment_method_display = dict(PaymentMethod.CHOICES).get(
            order.payment_method, order.payment_method
        )
        return {
            "invoice_number": invoice.invoice_number,
            "order_number": order.order_number,
            "issued_at": invoice.issued_at,
            "amount_due": invoice.remaining_balance,
            "customer_name": customer.name,
            "customer_phone": customer.phone,
            "customer_email": customer.email or "",
            "company_name": invoice.company_name,
            "company_address": invoice.company_address,
            "company_phone": invoice.company_phone,
            "number_of_items": order.number_of_items,
            "items_total": invoice.total,
            "subtotal": invoice.subtotal,
            "total": invoice.total,
            "paid": invoice.paid,
            "remaining_balance": invoice.remaining_balance,
            "payment_method": payment_method_display,
            "payment_amount": order.paid_amount,
            "items": [
                {
                    "label": item.label,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "line_total": item.line_total,
                }
                for item in order.items.all()
            ]
        }

    @staticmethod
    def render_html(invoice) -> str:
        context = InvoiceService.build_context(invoice)
        return render_to_string("invoices/invoice.html", context)

    @staticmethod
    def to_dict(invoice) -> dict:
        context = InvoiceService.build_context(invoice)
        items = invoice.order.items.all()
        if items.exists():
            line_items = [
                {
                    "label": item.label,
                    "quantity": item.quantity,
                    "price": str(item.unit_price),
                    "amount": str(item.line_total),
                }
                for item in items
            ]
        else:
            line_items = [
                {
                    "label": f"Ship 2 Aruba Order ({context['number_of_items']} Items)",
                    "quantity": 1,
                    "price": str(context["items_total"]),
                    "amount": str(context["items_total"]),
                }
            ]
        return {
            **context,
            "line_items": line_items,
            "company": {
                "name": settings.COMPANY_NAME,
                "address": settings.COMPANY_ADDRESS,
                "phone": settings.COMPANY_PHONE,
            },
        }
