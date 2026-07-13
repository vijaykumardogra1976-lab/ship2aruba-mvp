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
        
        # Build list of payments
        payments_list = []
        for p in order.payments.all().order_by("sequence"):
            method_display = dict(PaymentMethod.CHOICES).get(p.payment_method, p.payment_method)
            payments_list.append({
                "amount": p.amount,
                "payment_method": method_display,
                "paid_at": p.paid_at,
            })
            
        # Get platform display name
        from apps.common.enums import WebsiteType
        platform_name = "Ship 2 Aruba"
        if order.website_type == WebsiteType.AMAZON:
            platform_name = "Amazon"
        elif order.website_type == WebsiteType.EBAY:
            platform_name = "eBay"
        elif order.website_type == WebsiteType.OTHER:
            platform_name = order.website or "Other"

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
            # paid = what customer has paid so far (from invoice.paid)
            # remaining_balance = items_total - paid
            "fallback_platform": platform_name,
            "payments": payments_list,
            "items": [
                {
                    "label": item.label,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "line_total": item.line_total,
                    "image_url": f"{settings.BACKEND_URL}{item.product_image.url}" if item.product_image else item.image_url,
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
        platform_name = context["fallback_platform"]
        line_items = [
            {
                "label": f"{platform_name} Order ({context['number_of_items']} Items)",
                "quantity": 1,
                "price": str(context["items_total"]),
                "amount": str(context["items_total"]),
            }
        ]
            
        serialized_payments = [
            {
                "amount": str(p["amount"]),
                "payment_method": p["payment_method"],
                "paid_at": p["paid_at"].isoformat() if hasattr(p["paid_at"], "isoformat") else str(p["paid_at"]),
            }
            for p in context["payments"]
        ]
        
        # Serialize datetime fields for JSON response
        serialized_context = {**context}
        serialized_context["issued_at"] = context["issued_at"].isoformat() if hasattr(context["issued_at"], "isoformat") else str(context["issued_at"])
        # We don't want raw non-serializable payments in to_dict base
        serialized_context["payments"] = serialized_payments
        del serialized_context["items"]
        
        return {
            **serialized_context,
            "line_items": line_items,
            "company": {
                "name": settings.COMPANY_NAME,
                "address": settings.COMPANY_ADDRESS,
                "phone": settings.COMPANY_PHONE,
            },
        }
