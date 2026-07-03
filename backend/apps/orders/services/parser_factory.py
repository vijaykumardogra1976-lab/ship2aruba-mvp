"""
Parser Factory — Ship2Aruba
==============================
Routes uploaded files to the correct parsing strategy:

  PDF  → ImageExtractor → GeminiParser (PDF bytes + extracted images)
         └→ Regex fallback if Gemini fails
  Image → ImageExtractor (single image) → GeminiParser (image bytes)
         └→ Regex fallback (limited) if Gemini fails

The factory also assigns stock image URLs to items that Gemini could not
match to an extracted image, and handles the image_index → preview_url linkage.
"""

import logging
import re
from decimal import Decimal
from pathlib import Path
from typing import BinaryIO

from apps.orders.services.ai_document_parser import (
    AIDocumentParserService,
    ParseResult,
    ParsedItem,
)

logger = logging.getLogger("apps.orders.parser_factory")

# ---------------------------------------------------------------------------
# Supported file types
# ---------------------------------------------------------------------------

PDF_MIME = "application/pdf"
IMAGE_MIMES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}
SUPPORTED_EXTENSIONS = frozenset([".pdf", ".jpg", ".jpeg", ".png", ".webp"])


def _guess_mime(filename: str) -> tuple[str, bool]:
    """
    Returns (mime_type, is_pdf).
    """
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return PDF_MIME, True
    mime = IMAGE_MIMES.get(ext, "image/png")
    return mime, False


# ---------------------------------------------------------------------------
# Regex Fallback (Legacy)
# ---------------------------------------------------------------------------

class _RegexFallback:
    """
    Lightweight text-based parser.  Only works on PDFs with embedded text.
    Used when Gemini is unavailable or returns no items.
    """

    @staticmethod
    def parse(file_stream: BinaryIO) -> ParseResult:
        try:
            from pypdf import PdfReader
            file_stream.seek(0)
            reader = PdfReader(file_stream)
            text = "\n".join(
                page.extract_text() or "" for page in reader.pages
            )
        except Exception as exc:
            logger.warning("Regex fallback: could not read PDF text: %s", exc)
            return ParseResult(
                success=False,
                error="Could not extract text from PDF.",
                parse_method="regex",
            )

        if not text.strip():
            return ParseResult(
                success=False,
                error="PDF contains no extractable text (scanned/image PDF).",
                parse_method="regex",
            )

        items = _RegexFallback._extract_items(text)
        return ParseResult(
            success=len(items) > 0,
            items=items,
            confidence=0.45 if items else 0.0,
            parse_method="regex",
            error="" if items else "Regex found no purchasable items.",
        )

    @staticmethod
    def _extract_items(text: str) -> list[ParsedItem]:
        items: list[ParsedItem] = []
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        price_re = re.compile(r"\$?([0-9,]+\.[0-9]{2})")
        amazon_re = re.compile(r"(\d+)\s+of:\s+(.+)", re.IGNORECASE)

        # Amazon-style "N of: Product"
        for idx, line in enumerate(lines):
            m = amazon_re.match(line)
            if m:
                qty = int(m.group(1))
                desc = m.group(2).strip()
                price = Decimal("0.00")
                for off in range(1, 5):
                    if idx + off < len(lines):
                        pm = price_re.search(lines[idx + off])
                        if pm and not any(
                            k in lines[idx + off].lower()
                            for k in ["total", "subtotal", "tax", "shipping"]
                        ):
                            price = Decimal(pm.group(1).replace(",", ""))
                            break
                if price > 0:
                    items.append(
                        ParsedItem(
                            label=desc[:255],
                            quantity=qty,
                            unit_price=price,
                            line_total=price * qty,
                            image_url=AIDocumentParserService.get_image_for_label(desc),
                        )
                    )

        if items:
            return items

        # Generic price-on-line fallback
        for line in lines:
            if any(
                k in line.lower()
                for k in ["total", "subtotal", "tax", "shipping", "invoice", "balance"]
            ):
                continue
            pm = price_re.search(line)
            if not pm:
                continue
            try:
                price = Decimal(pm.group(1).replace(",", ""))
            except Exception:
                continue
            if price <= 0:
                continue
            desc = line.replace(pm.group(0), "").strip(" -:,|")
            desc = re.sub(r"\s+", " ", desc)
            qty_m = re.search(r"(?:qty|x|quantity)?\s*:?\s*(\d+)", desc, re.IGNORECASE)
            qty = 1
            if qty_m:
                try:
                    qty = max(1, int(qty_m.group(1)))
                    desc = desc.replace(qty_m.group(0), "").strip()
                except Exception:
                    pass
            if len(desc) > 3:
                items.append(
                    ParsedItem(
                        label=desc[:255],
                        quantity=qty,
                        unit_price=price,
                        line_total=price * qty,
                        image_url=AIDocumentParserService.get_image_for_label(desc),
                    )
                )

        return items


# ---------------------------------------------------------------------------
# Public Factory
# ---------------------------------------------------------------------------

class ParserFactory:
    """
    Routes a file to the correct parsing pipeline.

    PDF flow:
      1. Extract embedded images with ImageExtractor
      2. Send full PDF bytes + images to GeminiParser
      3. On Gemini failure → _RegexFallback

    Image flow:
      1. Load raw image bytes
      2. Send to GeminiParser
      3. On Gemini failure → empty ParseResult (regex has no value for pure images)
    """

    @classmethod
    def parse(cls, file_stream: BinaryIO, filename: str = "") -> ParseResult:
        """
        Main factory method.  Never raises.

        Returns ParseResult — check .success and .items.
        """
        mime_type, is_pdf = _guess_mime(filename)
        logger.info("ParserFactory: file=%s mime=%s is_pdf=%s", filename, mime_type, is_pdf)

        if is_pdf:
            return cls._parse_pdf(file_stream, filename)
        else:
            return cls._parse_image(file_stream, filename, mime_type)

    # ── PDF Pipeline ─────────────────────────────────────────────────────────

    @classmethod
    def _parse_pdf(cls, file_stream: BinaryIO, filename: str) -> ParseResult:
        from apps.orders.services.image_extractor import ImageExtractor
        from apps.orders.services.gemini_parser import GeminiParser

        # Step 1: Extract embedded images
        extraction = ImageExtractor.extract_from_pdf(file_stream, filename=filename)
        image_parts = extraction.get("image_parts", [])
        preview_urls = extraction.get("preview_urls", [])

        # Step 2: Read PDF bytes for Gemini
        try:
            file_stream.seek(0)
            pdf_bytes = file_stream.read()
            file_stream.seek(0)
        except Exception as exc:
            logger.error("Could not read PDF bytes: %s", exc)
            return ParseResult(
                success=False,
                error=f"Could not read uploaded file: {exc}",
                parse_method="error",
            )

        # Step 3: Gemini
        result = GeminiParser.parse_bytes(
            file_bytes=pdf_bytes,
            mime_type="application/pdf",
            image_parts=image_parts,
            filename=filename,
        )

        if result.success:
            result = cls._attach_images(result, preview_urls)
            result.preview_images = preview_urls
            return result

        # Step 4: Regex fallback
        logger.info("Gemini failed for '%s'; trying Regex fallback", filename)
        regex_result = _RegexFallback.parse(file_stream)
        if regex_result.success:
            regex_result.preview_images = preview_urls
            return regex_result

        # Step 5: Both failed — return combined error
        return ParseResult(
            success=False,
            error=f"Gemini: {result.error} | Regex: {regex_result.error}",
            preview_images=preview_urls,
            parse_method="fallback",
        )

    # ── Image Pipeline ───────────────────────────────────────────────────────

    @classmethod
    def _parse_image(
        cls, file_stream: BinaryIO, filename: str, mime_type: str
    ) -> ParseResult:
        from apps.orders.services.image_extractor import ImageExtractor
        from apps.orders.services.gemini_parser import GeminiParser

        extraction = ImageExtractor.load_image_file(file_stream, filename=filename)
        image_parts = extraction.get("image_parts", [])
        preview_urls = extraction.get("preview_urls", [])

        if not image_parts:
            return ParseResult(
                success=False,
                error="Could not load image file for parsing.",
                parse_method="error",
            )

        img_part = image_parts[0]
        result = GeminiParser.parse_bytes(
            file_bytes=img_part["data"],
            mime_type=img_part["mime_type"],
            image_parts=[],        # the file itself IS the image
            filename=filename,
        )

        result.preview_images = preview_urls
        if result.success:
            result = cls._attach_images(result, preview_urls)

        return result

    # ── Image Linker ─────────────────────────────────────────────────────────

    @staticmethod
    def _attach_images(result: ParseResult, preview_urls: list[str]) -> ParseResult:
        """
        Map item.image_index → a preview_url or stock image URL.
        Mutates result in place (items are Pydantic models — use model_copy).
        """
        updated_items = []
        for item in result.items:
            idx = getattr(item, "image_index", 0)
            if preview_urls and 0 <= idx < len(preview_urls):
                url = preview_urls[idx]
            elif preview_urls:
                url = preview_urls[0]
            else:
                url = AIDocumentParserService.get_image_for_label(item.label)

            updated_items.append(item.model_copy(update={"image_url": url}))

        result.items = updated_items
        return result
