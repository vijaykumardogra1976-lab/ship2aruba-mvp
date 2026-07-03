"""
Gemini Parser — Ship2Aruba
============================
Sends documents (PDF bytes or rendered page images) to Gemini 2.5 Flash
and parses the structured JSON response into a validated ParseResult.

Design:
  - Singleton Gemini client (reused across requests)
  - Retry with exponential backoff (up to 3 attempts)
  - Hard 60-second timeout per attempt
  - Strict JSON-only system prompt — no markdown leakage
  - Full Pydantic validation of AI response — never trusts raw AI output
"""

import json
import logging
import time
from decimal import Decimal
from typing import BinaryIO

from django.conf import settings

from apps.orders.services.ai_document_parser import ParseResult, ParsedItem

logger = logging.getLogger("apps.orders.gemini_parser")

# ---------------------------------------------------------------------------
# System Prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are an ecommerce document parser for Ship2Aruba, a logistics company.

The uploaded document may come from Amazon, Shein, eBay, Temu, AliExpress,
BestBuy, Walmart, Costco, Target or any ecommerce marketplace.
It may be a finalized Order, a Checkout page, or a Shopping Cart screenshot.

YOUR TASK: Extract ONLY the primary items in the order or active shopping cart.

IGNORE COMPLETELY:
- "Saved for later" or "Wishlist" items (very important!)
- Recommended products / "Customers also bought" / "You Might Like to Fill it With"
- Advertisements, sponsored items, banners
- Coupons, promotions, discounts (as line items)
- Shipping and handling rows (as line items)
- Tax rows or Gift wrap rows
- Return/refund instructions

For each ACTIVE/PURCHASED item, extract:
  - label: full product name with model/variant (max 500 chars)
  - quantity: integer number of units ordered/in cart (default 1)
  - unit_price: price per single unit in the document's currency (numeric only)
  - line_total: quantity × unit_price (numeric only)
  - seller: seller/brand name if visible (else empty string)
  - sku: ASIN/SKU/item code if visible (else empty string)
  - color: color variant if visible (else empty string)
  - size: size variant if visible (else empty string)
  - image_index: 0-based index of the product image in the uploaded images list (0 if unknown)

IMPORTANT RULES:
1. Return ONLY valid JSON — no markdown, no explanation, no code fences
2. All prices must be plain numbers (e.g. 29.99 NOT "$29.99")
3. If you cannot read the document clearly, set confidence to 0.3 or lower
4. If no items are found, return an empty items array

Return EXACTLY this JSON structure and nothing else:

{
  "marketplace": "",
  "currency": "USD",
  "subtotal": 0,
  "shipping": 0,
  "discount": 0,
  "grand_total": 0,
  "confidence": 0.95,
  "items": [
    {
      "label": "",
      "quantity": 1,
      "unit_price": 0,
      "line_total": 0,
      "seller": "",
      "sku": "",
      "color": "",
      "size": "",
      "image_index": 0
    }
  ]
}"""

# ---------------------------------------------------------------------------
# Gemini Client Singleton
# ---------------------------------------------------------------------------

_gemini_client = None
_gemini_model = None


def _get_gemini_model():
    """Return a reusable Gemini GenerativeModel instance."""
    global _gemini_client, _gemini_model

    if _gemini_model is not None:
        return _gemini_model

    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. Add it to your .env file."
        )

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=SYSTEM_PROMPT,
        )
        logger.info("Gemini client initialised with model=gemini-2.5-flash")
    except Exception as exc:
        logger.error("Failed to initialise Gemini client: %s", exc)
        raise

    return _gemini_model


# ---------------------------------------------------------------------------
# Response Parser
# ---------------------------------------------------------------------------

def _parse_gemini_response(raw_text: str) -> ParseResult:
    """
    Parse and validate the raw text returned by Gemini.
    Strips any accidental markdown fences before JSON parsing.
    """
    # Remove markdown code fences if present
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Drop first line (```json or ```) and last line (```)
        inner = [l for l in lines[1:] if l.strip() != "```"]
        text = "\n".join(inner).strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        logger.warning("Gemini returned invalid JSON: %s | raw=%s", exc, text[:300])
        return ParseResult(
            success=False,
            error=f"Gemini returned malformed JSON: {exc}",
            parse_method="gemini",
        )

    if not isinstance(data, dict):
        return ParseResult(
            success=False,
            error="Gemini response was not a JSON object.",
            parse_method="gemini",
        )

    # Validate and build ParsedItem list
    raw_items = data.get("items", [])
    if not isinstance(raw_items, list):
        raw_items = []

    validated_items: list[ParsedItem] = []
    for raw in raw_items:
        if not isinstance(raw, dict):
            continue
        try:
            item = ParsedItem(**raw)
            if item.unit_price > Decimal("0") or item.line_total > Decimal("0"):
                validated_items.append(item)
            else:
                logger.debug("Skipping zero-price item: %s", item.label)
        except Exception as exc:
            logger.debug("Skipping malformed item %s: %s", raw, exc)

    return ParseResult(
        success=len(validated_items) > 0,
        marketplace=str(data.get("marketplace", "")).strip()[:100],
        currency=str(data.get("currency", "USD")).strip()[:10],
        subtotal=data.get("subtotal", 0),
        shipping=data.get("shipping", 0),
        discount=data.get("discount", 0),
        grand_total=data.get("grand_total", 0),
        confidence=data.get("confidence", 0.0),
        items=validated_items,
        parse_method="gemini",
        error="" if validated_items else "Gemini returned 0 purchasable items.",
    )


# ---------------------------------------------------------------------------
# Public Gemini Parser
# ---------------------------------------------------------------------------

class GeminiParser:
    """
    Sends a document (as raw bytes + optional image parts) to Gemini 2.5 Flash.

    Retry strategy: up to MAX_RETRIES attempts with 2-second exponential backoff.
    """

    MAX_RETRIES = 3
    RETRY_DELAY_S = 2.0
    GENERATION_CONFIG = {
        "temperature": 0.1,        # near-deterministic for structured extraction
        "top_p": 0.95,
        "max_output_tokens": 8192,
        "response_mime_type": "application/json",
    }

    @classmethod
    def parse_bytes(
        cls,
        file_bytes: bytes,
        mime_type: str,
        image_parts: list[dict] | None = None,
        filename: str = "",
    ) -> ParseResult:
        """
        Send file bytes (+ optional extracted page images) to Gemini and return
        a validated ParseResult.

        Args:
            file_bytes:   Raw content of the document.
            mime_type:    MIME type string, e.g. "application/pdf" or "image/png".
            image_parts:  Optional list of {"mime_type": ..., "data": bytes} dicts
                          for extracted embedded images or rendered PDF pages.
            filename:     Original filename for logging.
        """
        try:
            model = _get_gemini_model()
        except RuntimeError as exc:
            return ParseResult(
                success=False,
                error=str(exc),
                parse_method="gemini",
            )

        # Build the message parts
        parts: list = [
            {"mime_type": mime_type, "data": file_bytes},
        ]
        if image_parts:
            for img_part in image_parts[:20]:   # cap at 20 embedded images
                parts.append(img_part)

        parts.append(
            "Extract all purchased products from this document. "
            "Return ONLY the JSON structure described in your instructions."
        )

        last_error = ""
        for attempt in range(1, cls.MAX_RETRIES + 1):
            try:
                logger.info(
                    "Gemini request: file=%s mime=%s attempt=%d",
                    filename, mime_type, attempt,
                )
                response = model.generate_content(
                    parts,
                    generation_config=cls.GENERATION_CONFIG,
                    request_options={"timeout": 60},
                )
                raw_text = response.text
                result = _parse_gemini_response(raw_text)
                if result.success:
                    logger.info(
                        "Gemini success: file=%s items=%d confidence=%.2f marketplace=%s",
                        filename, len(result.items), result.confidence, result.marketplace,
                    )
                    return result
                else:
                    last_error = result.error
                    logger.warning(
                        "Gemini attempt %d returned no items for file=%s: %s",
                        attempt, filename, last_error,
                    )

            except Exception as exc:
                last_error = str(exc)
                logger.warning(
                    "Gemini attempt %d failed for file=%s: %s",
                    attempt, filename, exc,
                )

            if attempt < cls.MAX_RETRIES:
                time.sleep(cls.RETRY_DELAY_S * attempt)

        return ParseResult(
            success=False,
            error=f"Gemini failed after {cls.MAX_RETRIES} attempts: {last_error}",
            parse_method="gemini",
        )
