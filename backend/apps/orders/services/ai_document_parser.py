"""
AI Document Parser — Ship2Aruba
================================
Orchestrates document parsing for all uploaded files (PDF, PNG, JPG, WEBP, etc.).
Delegates to Gemini for AI extraction, with Regex as a safe fallback.

Architecture:
  ai_document_parser.py  ← this file (schemas + orchestrator)
  gemini_parser.py       ← Gemini 2.5 Flash client
  image_extractor.py     ← PDF embedded image / page renderer
  parser_factory.py      ← routes PDF vs image uploads
"""

import hashlib
import logging
import re
from decimal import Decimal, InvalidOperation
from typing import BinaryIO

from pydantic import BaseModel, Field, field_validator, model_validator

logger = logging.getLogger("apps.orders.ai_parser")

# ---------------------------------------------------------------------------
# Pydantic Schemas — validated AI response shapes
# ---------------------------------------------------------------------------

class ParsedItem(BaseModel):
    """A single product extracted from a document."""

    label: str = Field(..., min_length=1, max_length=512)
    quantity: int = Field(default=1, ge=1, le=9999)
    unit_price: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0"))
    line_total: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0"))
    seller: str = Field(default="")
    sku: str = Field(default="")
    color: str = Field(default="")
    size: str = Field(default="")
    image_index: int = Field(default=0, ge=0)
    image_url: str = Field(default="")  # populated after image extraction
    is_converted: bool = Field(default=False)  # True = already in AWG

    @field_validator("label", mode="before")
    @classmethod
    def sanitize_label(cls, v: object) -> str:
        """Strip control chars and excessive whitespace."""
        if not isinstance(v, str):
            v = str(v)
        v = re.sub(r"[\x00-\x1f\x7f]", " ", v)
        return re.sub(r"\s+", " ", v).strip()[:512]

    @field_validator("unit_price", "line_total", mode="before")
    @classmethod
    def coerce_decimal(cls, v: object) -> Decimal:
        try:
            return Decimal(str(v)).quantize(Decimal("0.01"))
        except (InvalidOperation, TypeError, ValueError):
            return Decimal("0.00")

    @field_validator("quantity", mode="before")
    @classmethod
    def coerce_quantity(cls, v: object) -> int:
        try:
            qty = int(float(str(v)))
            return max(1, min(qty, 9999))
        except (TypeError, ValueError):
            return 1

    @model_validator(mode="after")
    def ensure_line_total(self) -> "ParsedItem":
        """If line_total is 0 but unit_price is set, recompute."""
        if self.line_total == Decimal("0.00") and self.unit_price > Decimal("0.00"):
            self.line_total = (self.unit_price * self.quantity).quantize(Decimal("0.01"))
        return self


class ParseResult(BaseModel):
    """Full structured result returned by the AI parser."""

    success: bool = True
    marketplace: str = ""
    currency: str = "USD"
    subtotal: Decimal = Decimal("0.00")
    shipping: Decimal = Decimal("0.00")
    discount: Decimal = Decimal("0.00")
    grand_total: Decimal = Decimal("0.00")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    items: list[ParsedItem] = Field(default_factory=list)
    preview_images: list[str] = Field(default_factory=list)
    parse_method: str = "unknown"  # "gemini" | "regex" | "fallback"
    error: str = ""

    @field_validator("subtotal", "shipping", "discount", "grand_total", mode="before")
    @classmethod
    def coerce_decimal(cls, v: object) -> Decimal:
        try:
            return Decimal(str(v)).quantize(Decimal("0.01"))
        except (InvalidOperation, TypeError, ValueError):
            return Decimal("0.00")

    @field_validator("confidence", mode="before")
    @classmethod
    def clamp_confidence(cls, v: object) -> float:
        try:
            return max(0.0, min(1.0, float(v)))
        except (TypeError, ValueError):
            return 0.0


EMPTY_RESULT = ParseResult(success=False, items=[], error="No items could be extracted.")


# ---------------------------------------------------------------------------
# In-process SHA256 cache — avoids duplicate Gemini calls for same file
# ---------------------------------------------------------------------------

_parse_cache: dict[str, ParseResult] = {}
_CACHE_MAX = 128


def _sha256_of_stream(stream: BinaryIO) -> str:
    """Hash a file stream without consuming it (seeks back to 0)."""
    h = hashlib.sha256()
    stream.seek(0)
    for chunk in iter(lambda: stream.read(65536), b""):
        h.update(chunk)
    stream.seek(0)
    return h.hexdigest()


def _cache_get(file_hash: str) -> ParseResult | None:
    return _parse_cache.get(file_hash)


def _cache_set(file_hash: str, result: ParseResult) -> None:
    if len(_parse_cache) >= _CACHE_MAX:
        # Evict oldest entry (FIFO)
        oldest = next(iter(_parse_cache))
        del _parse_cache[oldest]
    _parse_cache[file_hash] = result


# ---------------------------------------------------------------------------
# Public Service
# ---------------------------------------------------------------------------

class AIDocumentParserService:
    """
    Production-grade AI document parser for ecommerce order documents.

    Supports PDF, PNG, JPG, JPEG, WEBP, mobile screenshots, and scanned docs.
    Uses Gemini 2.5 Flash as primary engine with Regex as safe fallback.
    Results are cached in-process by SHA256 to avoid duplicate API calls.

    Usage::

        result = AIDocumentParserService.parse(file_stream, filename="order.pdf")
        for item in result.items:
            print(item.label, item.quantity, item.unit_price)
    """

    @classmethod
    def parse(
        cls,
        file_stream: BinaryIO,
        filename: str = "",
    ) -> ParseResult:
        """
        Main entry point.  Accepts any supported file type.

        Args:
            file_stream: Readable binary stream (Django UploadedFile or open file).
            filename:    Original filename (used to determine content type).

        Returns:
            ParseResult — never raises; failures are captured in .success / .error.
        """
        from apps.orders.services.parser_factory import ParserFactory

        try:
            file_hash = _sha256_of_stream(file_stream)
        except Exception:
            file_hash = ""

        # Cache hit
        if file_hash and (cached := _cache_get(file_hash)):
            logger.info("AI parser: cache hit for file_hash=%s", file_hash[:12])
            return cached

        try:
            result = ParserFactory.parse(file_stream=file_stream, filename=filename)
        except Exception as exc:
            logger.exception("AI parser: unexpected error for file=%s: %s", filename, exc)
            result = ParseResult(
                success=False,
                error=f"Unexpected parser error: {exc}",
                parse_method="error",
            )

        if file_hash and result.success:
            _cache_set(file_hash, result)

        return result

    @staticmethod
    def get_image_for_label(label: str) -> str:
        """
        Backward-compatible helper: returns a stock image URL for a product label.
        Used as fallback when no embedded image is found.
        """
        import re as _re

        PRODUCT_IMAGES = [
            (_re.compile(r"macbook|laptop|computer|notebook|asus|dell|hp|lenovo", _re.IGNORECASE),
             "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200"),
            (_re.compile(r"mouse|trackpad|keyboard", _re.IGNORECASE),
             "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=200"),
            (_re.compile(r"airpods|headphone|earbud|sony|bose", _re.IGNORECASE),
             "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200"),
            (_re.compile(r"iphone|phone|samsung|pixel|mobile", _re.IGNORECASE),
             "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200"),
            (_re.compile(r"watch|smartwatch|apple watch|fitbit", _re.IGNORECASE),
             "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200"),
            (_re.compile(r"shoe|sneaker|nike|adidas|puma", _re.IGNORECASE),
             "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200"),
            (_re.compile(r"camera|lens|gopro|sony alpha", _re.IGNORECASE),
             "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200"),
        ]
        DEFAULT_IMAGE = "https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=200"

        for pattern, url in PRODUCT_IMAGES:
            if pattern.search(label):
                return url
        return DEFAULT_IMAGE
