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
    def upload_pdf(*, order: Order, user, uploaded_file) -> OrderDocument:
        from apps.orders.services.pdf_parser import PDFInvoiceParserService
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

            # Extract items from PDF
            try:
                document.file.seek(0)
                parsed_items = PDFInvoiceParserService.parse_pdf(document.file)
            except Exception as e:
                import logging
                logging.getLogger("apps.orders").exception("Failed parsing PDF file: %s", e)
                parsed_items = []

            # Determine conversion rate from USD to AWG
            try:
                usd_total = Decimal(str(order.amount_usd))
                awg_total = Decimal(str(order.items_total))
                conversion_rate = awg_total / usd_total if usd_total > 0 else Decimal("1.75")
            except Exception:
                conversion_rate = Decimal("1.75")

            # Fallback if no items could be parsed
            if not parsed_items:
                website_label = order.website or dict(order.website_type).get(order.website_type, order.website_type) or "Items"
                fallback_label = f"{website_label} Shipment Package"
                qty = order.number_of_items or 1
                unit_p_awg = Decimal(str(order.items_total)) / Decimal(str(qty))
                parsed_items = [{
                    "label": fallback_label,
                    "quantity": qty,
                    "unit_price": unit_p_awg, # already in AWG
                    "line_total": order.items_total, # already in AWG
                    "image_url": PDFInvoiceParserService.get_image_for_label(fallback_label),
                    "is_converted": True
                }]

            # Clear existing items
            order.items.all().delete()

            # Insert new parsed items
            for item in parsed_items:
                is_converted = item.get("is_converted", False)
                unit_p = Decimal(str(item["unit_price"]))
                line_tot = Decimal(str(item["line_total"]))

                if not is_converted:
                    # Convert USD to AWG
                    unit_p = (unit_p * conversion_rate).quantize(Decimal("0.01"))
                    line_tot = (line_tot * conversion_rate).quantize(Decimal("0.01"))

                OrderItem.objects.create(
                    order=order,
                    label=item["label"],
                    quantity=item["quantity"],
                    unit_price=unit_p,
                    line_total=line_tot,
                    image_url=item.get("image_url", "")
                )

        return document

