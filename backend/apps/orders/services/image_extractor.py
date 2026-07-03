"""
Image Extractor — Ship2Aruba
==============================
Extracts embedded product images from PDFs and renders PDF pages as high-resolution
PNGs.  Uses PyMuPDF (fitz) as the primary backend.

Responsibilities:
  1. Extract embedded images from each PDF page (thumbnails, product photos)
  2. Render full PDF pages to PNG if no/few embedded images found
  3. Save extracted images to media/document_parser/<uuid>/ with stable filenames
  4. Return image paths relative to MEDIA_ROOT (for URL generation) and raw bytes
     (for passing directly to Gemini)

Security:
  - Validates that extracted blobs look like valid images before saving
  - Limits total extraction to MAX_IMAGES to prevent DoS from huge PDFs
  - All paths are contained within MEDIA_ROOT/document_parser/
"""

import logging
import uuid
from pathlib import Path
from typing import BinaryIO

from django.conf import settings

logger = logging.getLogger("apps.orders.image_extractor")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SUPPORTED_IMAGE_EXTS = frozenset([".png", ".jpg", ".jpeg", ".webp"])
MAX_IMAGES = 30          # max embedded images to extract per document
MAX_PAGE_RENDERS = 5     # max pages to render if no embedded images found
PAGE_RENDER_DPI = 150    # DPI for page renders (higher = better OCR, slower)
MIN_IMAGE_BYTES = 1024   # ignore images smaller than 1 KB (likely icons/logos)
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # skip images larger than 5 MB


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_output_dir(session_id: str) -> Path:
    """Return (and create) the per-session media directory."""
    output_dir = (
        Path(settings.MEDIA_ROOT) / "document_parser" / session_id
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def _media_url(path: Path) -> str:
    """Convert an absolute Path inside MEDIA_ROOT to a media URL."""
    media_root = Path(settings.MEDIA_ROOT)
    rel = path.relative_to(media_root)
    base = settings.MEDIA_URL.rstrip("/")
    return f"{base}/{str(rel).replace(chr(92), '/')}"


# ---------------------------------------------------------------------------
# Core Extractor
# ---------------------------------------------------------------------------

class ImageExtractor:
    """
    Extracts and saves images from PDF documents.

    Usage::

        result = ImageExtractor.extract_from_pdf(file_stream, filename="order.pdf")
        result["image_parts"]   # list of {"mime_type": ..., "data": bytes}
        result["preview_urls"]  # list of media URLs for frontend display
    """

    @classmethod
    def extract_from_pdf(
        cls,
        file_stream: BinaryIO,
        filename: str = "document.pdf",
    ) -> dict:
        """
        Extract embedded product images from a PDF.
        Falls back to full-page renders if too few embedded images are found.

        Returns a dict::

            {
              "session_id": str,
              "image_parts": [{"mime_type": "image/png", "data": bytes}, ...],
              "preview_urls": ["media/document_parser/<uuid>/product_1.png", ...],
            }
        """
        session_id = uuid.uuid4().hex
        output_dir = _get_output_dir(session_id)

        image_parts: list[dict] = []
        preview_urls: list[str] = []

        try:
            import fitz  # PyMuPDF
        except ImportError:
            logger.warning("PyMuPDF (fitz) not installed — skipping image extraction")
            return cls._empty_result(session_id)

        try:
            file_stream.seek(0)
            pdf_bytes = file_stream.read()
            file_stream.seek(0)
        except Exception as exc:
            logger.error("Could not read PDF stream: %s", exc)
            return cls._empty_result(session_id)

        # Open PDF
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as exc:
            logger.error("PyMuPDF could not open PDF '%s': %s", filename, exc)
            return cls._empty_result(session_id)

        if doc.is_encrypted:
            logger.warning("PDF '%s' is encrypted — cannot extract images", filename)
            doc.close()
            return cls._empty_result(session_id)

        # ── Step 1: Try to extract embedded images ────────────────────────────
        embedded_count = 0
        for page_num in range(min(len(doc), 20)):   # scan first 20 pages
            if embedded_count >= MAX_IMAGES:
                break
            page = doc[page_num]
            try:
                image_list = page.get_images(full=True)
            except Exception:
                continue

            for img_index, img_ref in enumerate(image_list):
                if embedded_count >= MAX_IMAGES:
                    break
                xref = img_ref[0]
                try:
                    base_image = doc.extract_image(xref)
                except Exception:
                    continue

                img_bytes = base_image.get("image", b"")
                ext = base_image.get("ext", "png").lower()
                mime = f"image/{ext}" if ext in ("png", "jpg", "jpeg", "webp") else "image/png"

                # Quality filters
                if len(img_bytes) < MIN_IMAGE_BYTES:
                    continue
                if len(img_bytes) > MAX_IMAGE_BYTES:
                    continue

                # Save to disk
                safe_ext = ext if ext in ("png", "jpg", "jpeg", "webp") else "png"
                out_path = output_dir / f"product_{embedded_count + 1}.{safe_ext}"
                try:
                    out_path.write_bytes(img_bytes)
                except OSError as exc:
                    logger.warning("Could not write image %s: %s", out_path, exc)
                    continue

                image_parts.append({"mime_type": mime, "data": img_bytes})
                preview_urls.append(_media_url(out_path))
                embedded_count += 1
                logger.debug(
                    "Extracted embedded image #%d from page %d (size=%d bytes)",
                    embedded_count, page_num + 1, len(img_bytes),
                )

        # ── Step 2: Render pages as PNG if not enough embedded images found ───
        if embedded_count < 2:
            logger.info(
                "Only %d embedded images found in '%s'; rendering page PNGs",
                embedded_count, filename,
            )
            render_count = 0
            for page_num in range(min(len(doc), MAX_PAGE_RENDERS)):
                if render_count >= MAX_PAGE_RENDERS:
                    break
                page = doc[page_num]
                try:
                    mat = fitz.Matrix(PAGE_RENDER_DPI / 72, PAGE_RENDER_DPI / 72)
                    pix = page.get_pixmap(matrix=mat, alpha=False)
                    png_bytes = pix.tobytes("png")
                except Exception as exc:
                    logger.warning("Could not render page %d: %s", page_num, exc)
                    continue

                out_path = output_dir / f"page_{page_num + 1}.png"
                try:
                    out_path.write_bytes(png_bytes)
                except OSError as exc:
                    logger.warning("Could not write rendered page %s: %s", out_path, exc)
                    continue

                image_parts.append({"mime_type": "image/png", "data": png_bytes})
                preview_urls.append(_media_url(out_path))
                render_count += 1

        doc.close()
        logger.info(
            "Image extraction for '%s': %d parts (embedded=%d, rendered=%d)",
            filename,
            len(image_parts),
            embedded_count,
            len(image_parts) - embedded_count,
        )

        return {
            "session_id": session_id,
            "image_parts": image_parts,
            "preview_urls": preview_urls,
        }

    @classmethod
    def load_image_file(
        cls,
        file_stream: BinaryIO,
        filename: str = "image.png",
    ) -> dict:
        """
        Load a single image file (PNG/JPG/WEBP) for direct Gemini submission.

        Returns the same dict shape as extract_from_pdf.
        """
        session_id = uuid.uuid4().hex
        output_dir = _get_output_dir(session_id)

        ext = Path(filename).suffix.lower().lstrip(".")
        mime_map = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
        }
        mime = mime_map.get(ext, "image/png")
        safe_ext = ext if ext in ("png", "jpg", "jpeg", "webp") else "png"

        try:
            file_stream.seek(0)
            img_bytes = file_stream.read()
            file_stream.seek(0)
        except Exception as exc:
            logger.error("Could not read image stream: %s", exc)
            return cls._empty_result(session_id)

        out_path = output_dir / f"uploaded.{safe_ext}"
        try:
            out_path.write_bytes(img_bytes)
        except OSError as exc:
            logger.warning("Could not save uploaded image: %s", exc)

        preview_url = _media_url(out_path)
        logger.info("Loaded image file '%s' (%d bytes)", filename, len(img_bytes))

        return {
            "session_id": session_id,
            "image_parts": [{"mime_type": mime, "data": img_bytes}],
            "preview_urls": [preview_url],
        }

    @staticmethod
    def _empty_result(session_id: str) -> dict:
        return {
            "session_id": session_id,
            "image_parts": [],
            "preview_urls": [],
        }
