import io
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from apps.invoices.services.invoice_service import InvoiceService

logger = logging.getLogger("apps.notifications")


def _generate_invoice_pdf(invoice) -> bytes | None:
    """Generate a PDF from the invoice.html template using xhtml2pdf."""
    try:
        from xhtml2pdf import pisa  # noqa: PLC0415

        context = InvoiceService.build_context(invoice)
        html_string = render_to_string("invoices/invoice.html", context)

        pdf_buffer = io.BytesIO()
        result = pisa.CreatePDF(io.StringIO(html_string), dest=pdf_buffer)
        if result.err:
            logger.warning("xhtml2pdf reported errors generating PDF for invoice %s.", invoice.invoice_number)
            return None
        return pdf_buffer.getvalue()
    except ImportError:
        logger.warning("xhtml2pdf not installed. PDF attachment will be skipped.")
        return None
    except Exception:
        logger.exception("Unexpected error generating PDF for invoice %s.", invoice.invoice_number)
        return None


class EmailService:
    @staticmethod
    def is_configured() -> bool:
        backend = settings.EMAIL_BACKEND
        if "console" in backend:
            return True
        return bool(settings.EMAIL_HOST and settings.DEFAULT_FROM_EMAIL)

    @staticmethod
    def send_invoice_email(order) -> bool:
        customer = order.customer
        if not customer.email:
            logger.info("Skipping email: customer %s has no email.", customer.id)
            return False

        if not EmailService.is_configured():
            logger.info("Email service is not configured.")
            return False

        try:
            invoice = order.invoice
            context = InvoiceService.build_context(invoice)

            # Render inline invoice HTML (for the email body preview)
            invoice_html = render_to_string("invoices/invoice.html", context)

            # Render the outer email wrapper
            body_html = render_to_string(
                "invoices/invoice_email.html",
                {
                    "customer_name": customer.name,
                    "invoice_html": invoice_html,
                },
            )

            subject = f"Invoice #{invoice.invoice_number} – Ship2Aruba Order {order.order_number}"

            email = EmailMultiAlternatives(
                subject=subject,
                body=(
                    f"Hello {customer.name},\n\n"
                    f"Thank you for your order {order.order_number}.\n"
                    "Your invoice is attached as a PDF.\n\n"
                    "Ship2Aruba Team"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[customer.email],
            )
            email.attach_alternative(body_html, "text/html")

            # Attach PDF invoice
            pdf_bytes = _generate_invoice_pdf(invoice)
            if pdf_bytes:
                filename = f"Invoice_{invoice.invoice_number}.pdf"
                email.attach(filename, pdf_bytes, "application/pdf")
                logger.info("PDF invoice attached: %s", filename)
            else:
                logger.warning("PDF could not be generated; sending email without attachment.")

            email.send(fail_silently=True)
            logger.info("Invoice email sent to %s for order %s.", customer.email, order.order_number)
            return True

        except Exception:
            logger.exception(
                "Failed to send invoice email for order %s to %s.",
                order.order_number,
                customer.email,
            )
            return False

    @staticmethod
    def send_item_status_email(item, new_status: str) -> bool:
        order = item.order
        customer = order.customer
        if not customer.email:
            logger.info("Skipping item status email: customer %s has no email.", customer.id)
            return False

        if not EmailService.is_configured():
            logger.info("Email service is not configured.")
            return False

        try:
            subject = f"Ship2Aruba Shipment Update: Status changed for {item.label[:30]}..."
            body = (
                f"Hello {customer.name},\n\n"
                f"This is an update regarding your order {order.order_number}.\n\n"
                f"The status of the following item has been updated:\n"
                f"Item: {item.label}\n"
                f"New Status: {new_status}\n\n"
                f"You can log into your client portal at http://localhost:5173/client/ to view the full details and track your shipment.\n\n"
                f"Thank you,\n"
                f"Ship2Aruba Team"
            )

            html_content = render_to_string(
                "invoices/item_status_email.html",
                {
                    "customer_name": customer.name,
                    "order_number": order.order_number,
                    "item_label": item.label,
                    "new_status": new_status,
                    "tracking_number": item.tracking_number or item.fedex_tracking_number or "Not available yet",
                    "company_phone": settings.COMPANY_PHONE,
                    "company_name": settings.COMPANY_NAME,
                }
            )

            email = EmailMultiAlternatives(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[customer.email],
            )
            email.attach_alternative(html_content, "text/html")
            email.send(fail_silently=True)
            logger.info("Item status email sent to %s for item %s.", customer.email, item.id)
            return True
        except Exception:
            logger.exception("Failed to send item status email for item %s to %s.", item.id, customer.email)
            return False

