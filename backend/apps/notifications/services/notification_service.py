import logging

from apps.notifications.services.email_service import EmailService
from apps.notifications.services.whatsapp_service import WhatsAppService
from apps.orders.models import Order

logger = logging.getLogger("apps.notifications")


class NotificationService:
    """
    Orchestrates outbound notifications after order creation.
    Designed so Celery/Redis can wrap send_order_created later without
    changing OrderService or business logic.
    """

    @staticmethod
    def send_order_created(order_id: int) -> None:
        try:
            order = Order.objects.select_related("customer", "invoice").get(pk=order_id)
        except Order.DoesNotExist:
            logger.error("Order %s not found for notification.", order_id)
            return

        NotificationService._send_email(order)
        NotificationService._send_whatsapp(order)

    @staticmethod
    def _send_email(order) -> None:
        try:
            EmailService.send_invoice_email(order)
        except Exception:
            logger.exception("Unexpected error in email notification for order %s.", order.order_number)

    @staticmethod
    def _send_whatsapp(order) -> None:
        try:
            WhatsAppService.send_invoice(order)
        except Exception:
            logger.exception("Unexpected error in WhatsApp notification for order %s.", order.order_number)
