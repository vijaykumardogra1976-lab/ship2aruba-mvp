from decimal import Decimal

from django.conf import settings
from django.db import transaction

from apps.orders.models import Order, OrderDocument, OrderItem


class OrderViewerService:
    @staticmethod
    def update_status_toggles(*, order: Order, validated_data: dict) -> Order:
        update_fields = ["updated_at"]
        for field in ("is_az_ordered", "is_uploaded", "is_in_myus", "is_completed"):
            if field in validated_data:
                setattr(order, field, validated_data[field])
                update_fields.append(field)

        order.save(update_fields=update_fields)
        return order

    @staticmethod
    def edit_record(*, order: Order, validated_data: dict) -> Order:
        authorization_password = validated_data.pop("authorization_password")
        expected = settings.ORDER_EDIT_AUTHORIZATION_PASSWORD
        if not expected or authorization_password != expected:
            raise PermissionError("Invalid authorization password.")

        with transaction.atomic():
            if "items_total" in validated_data:
                order.items_total = validated_data["items_total"]
            if "amount_usd" in validated_data:
                order.amount_usd = validated_data["amount_usd"]
            if "order_date" in validated_data:
                order.order_date = validated_data["order_date"]

            order.remaining_balance = order.items_total - order.paid_amount
            order.save()

            OrderItem.objects.filter(order=order).update(
                unit_price=order.items_total,
                line_total=order.items_total,
            )

            if hasattr(order, "invoice"):
                invoice = order.invoice
                invoice.subtotal = order.items_total
                invoice.total = order.items_total
                invoice.remaining_balance = order.remaining_balance
                invoice.save()

        return order

    @staticmethod
    def delete_order(*, order: Order) -> None:
        order.delete()

    @staticmethod
    def upload_pdf(*, order: Order, user, uploaded_file, parse_result=None) -> OrderDocument:
        """
        Accept a PDF or image document, extract order items using the AI parser,
        persist them on the order, and return the saved OrderDocument.

        Steps:
          1. Save the uploaded file as an OrderDocument.
          2. Call AIDocumentParserService to extract items (Gemini → Regex → fallback) if not provided.
          3. Convert prices from the document currency (USD) to AWG using the
             order's existing conversion rate.
          4. Replace existing OrderItems with the freshly parsed ones.
          5. If parsing totally fails, create a single generic fallback item.
        """
        from apps.orders.services.ai_document_parser import AIDocumentParserService

        with transaction.atomic():
            document, _created = OrderDocument.objects.get_or_create(order=order)
            if document.file:
                document.file.delete(save=False)
            document.file = uploaded_file
            document.uploaded_by = user
            document.save()

            order.is_az_ordered = True
            order.is_uploaded = True
            order.save(update_fields=["is_az_ordered", "is_uploaded", "updated_at"])

            # ── AI parsing ────────────────────────────────────────────────────
            if not parse_result:
                try:
                    import logging as _logging
                    _logger = _logging.getLogger("apps.orders.order_viewer_service")
                    document.file.seek(0)
                    parse_result = AIDocumentParserService.parse(
                        file_stream=document.file,
                        filename=getattr(uploaded_file, "name", "document"),
                    )
                    _logger.info(
                        "Document parsed: order=%s success=%s items=%d method=%s "
                        "marketplace=%s confidence=%.2f",
                        order.order_number,
                        parse_result.success,
                        len(parse_result.items),
                        parse_result.parse_method,
                        parse_result.marketplace,
                        parse_result.confidence,
                    )
                except Exception as exc:
                    import logging as _logging
                    _logging.getLogger("apps.orders.order_viewer_service").exception(
                        "AI parser raised for order=%s: %s", order.order_number, exc
                    )
                    parse_result = None

            # ── Currency conversion rate ───────────────────────────────────
            try:
                usd_total = Decimal(str(order.amount_usd))
                awg_total = Decimal(str(order.items_total))
                conversion_rate = (
                    awg_total / usd_total if usd_total > 0 else Decimal("1.75")
                )
                if conversion_rate <= 0:
                    conversion_rate = Decimal("1.75")
            except Exception:
                conversion_rate = Decimal("1.75")

            # ── Build parsed_items list ────────────────────────────────────
            parsed_items: list[dict] = []

            if parse_result and parse_result.success and parse_result.items:
                for item in parse_result.items:
                    parsed_items.append({
                        "label": item.label,
                        "quantity": item.quantity,
                        "unit_price": item.unit_price,
                        "line_total": item.line_total,
                        "image_url": item.image_url,
                        "is_converted": item.is_converted,
                    })

            # ── Fallback: generic item if nothing was extracted ────────────
            if not parsed_items:
                website_label = (
                    order.website
                    or order.website_type
                    or "Items"
                )
                fallback_label = f"{website_label} Shipment Package"
                qty = order.number_of_items or 1
                unit_p_awg = Decimal(str(order.items_total)) / Decimal(str(qty))
                parsed_items = [{
                    "label": fallback_label,
                    "quantity": qty,
                    "unit_price": unit_p_awg,
                    "line_total": order.items_total,
                    "image_url": AIDocumentParserService.get_image_for_label(fallback_label),
                    "is_converted": True,
                }]

            # ── Persist order items ────────────────────────────────────────
            from django.db.models import Q
            fallback_items = order.items.filter(
                Q(label__icontains="Shipment Package") |
                Q(label__icontains="Ship 2 Aruba Order")
            )
            if fallback_items.exists():
                fallback_items.delete()

            import os
            from django.conf import settings
            from django.core.files import File

            for item in parsed_items:
                is_converted = item.get("is_converted", False)
                unit_p = Decimal(str(item["unit_price"]))
                line_tot = Decimal(str(item["line_total"]))

                if not is_converted:
                    unit_p = (unit_p * conversion_rate).quantize(Decimal("0.01"))
                    line_tot = (line_tot * conversion_rate).quantize(Decimal("0.01"))
                
                image_url = item.get("image_url", "")

                order_item = OrderItem.objects.create(
                    order=order,
                    label=item["label"],
                    quantity=item["quantity"],
                    unit_price=unit_p,
                    line_total=line_tot,
                    image_url=image_url,
                )

                if image_url:
                    # Strip leading slash if present on MEDIA_URL to match how _media_url returns
                    media_base = settings.MEDIA_URL.rstrip("/") + "/"
                    if image_url.startswith(media_base):
                        rel_path = image_url[len(media_base):].lstrip("/")
                        abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
                        if os.path.exists(abs_path):
                            with open(abs_path, 'rb') as f:
                                order_item.product_image.save(os.path.basename(abs_path), File(f), save=True)

            # Recalculate order numbers and financials with the new items appended
            from apps.orders.views import _recalculate_order_totals
            _recalculate_order_totals(order)

        return document


