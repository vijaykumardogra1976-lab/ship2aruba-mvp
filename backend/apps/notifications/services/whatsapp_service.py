import logging
from dataclasses import dataclass
from typing import Any

from django.conf import settings

logger = logging.getLogger("apps.notifications")


@dataclass
class WhatsAppConfig:
    access_token: str
    phone_number_id: str
    api_version: str

    @property
    def is_configured(self) -> bool:
        return bool(self.access_token and self.phone_number_id and self.api_version)


class WhatsAppService:
    """Architecture-only. Implement Meta API call when credentials are available."""

    @staticmethod
    def load_config() -> WhatsAppConfig:
        return WhatsAppConfig(
            access_token=settings.WHATSAPP_ACCESS_TOKEN,
            phone_number_id=settings.WHATSAPP_PHONE_NUMBER_ID,
            api_version=settings.WHATSAPP_API_VERSION,
        )

    @staticmethod
    def is_configured() -> bool:
        return WhatsAppService.load_config().is_configured

    @staticmethod
    def build_request(order) -> dict[str, Any]:
        customer = order.customer
        return {
            "messaging_product": "whatsapp",
            "to": customer.phone,
            "type": "template",
            "template": {
                "name": "order_invoice",
                "language": {"code": "en"},
            },
        }

    @staticmethod
    def parse_response(response_data: dict[str, Any]) -> dict[str, Any]:
        return {
            "success": "messages" in response_data,
            "message_id": (
                response_data.get("messages", [{}])[0].get("id")
                if response_data.get("messages")
                else None
            ),
            "raw": response_data,
        }

    @staticmethod
    def send_invoice(order) -> bool:
        config = WhatsAppService.load_config()
        if not config.is_configured:
            logger.info("WhatsApp service is not configured.")
            return False

        try:
            request_payload = WhatsAppService.build_request(order)
            logger.info(
                "WhatsApp send_invoice placeholder for order %s. Payload prepared: %s",
                order.order_number,
                {k: v for k, v in request_payload.items() if k != "template"},
            )
            # Future: implement Meta WhatsApp Cloud API HTTP request here.
            return False
        except Exception:
            logger.exception(
                "Failed to send WhatsApp invoice for order %s.", order.order_number
            )
            return False
