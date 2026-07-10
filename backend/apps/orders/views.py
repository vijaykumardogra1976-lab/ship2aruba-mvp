from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsStaffUser
from apps.invoices.services.invoice_service import InvoiceService
from apps.orders.filters import OrderFilter
from apps.orders.models import Order, OrderItem
from apps.orders.serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderDocumentSerializer,
    OrderEditSerializer,
    OrderItemSerializer,
    OrderListSerializer,
    OrderStatusToggleSerializer,
    PaymentCreateSerializer,
    PaymentHistorySerializer,
    PaymentSerializer,
)
from apps.orders.services.order_service import OrderService
from apps.orders.services.order_viewer_service import OrderViewerService
from apps.payments.services.payment_service import PaymentService


class OrderListCreateView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        queryset = (
            Order.objects.select_related("customer", "created_by", "document")
            .prefetch_related("items", "payments")
            .all()
        )
        filterset = OrderFilter(request.query_params, queryset=queryset)
        if not filterset.is_valid():
            return Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)
        queryset = filterset.qs

        from apps.common.pagination import StandardPagination
        from apps.orders.pagination import OrderListPagination

        paginator = OrderListPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = OrderListSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = OrderService.create_order(
            user=request.user, validated_data=serializer.validated_data
        )
        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class OrderDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [IsStaffUser]
    queryset = Order.objects.select_related("customer", "invoice", "created_by", "document").all()
    serializer_class = OrderDetailSerializer

    def destroy(self, request, *args, **kwargs):
        order = self.get_object()
        OrderViewerService.delete_order(order=order)
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrderInvoiceView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        order = get_object_or_404(
            Order.objects.select_related("customer", "invoice"), pk=pk
        )
        if not hasattr(order, "invoice"):
            return Response(
                {"detail": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(InvoiceService.to_dict(order.invoice))


class OrderStatusToggleView(APIView):
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        serializer = OrderStatusToggleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = OrderViewerService.update_status_toggles(
            order=order, validated_data=serializer.validated_data
        )
        return Response(OrderListSerializer(order, context={"request": request}).data)


class OrderEditView(APIView):
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        order = get_object_or_404(
            Order.objects.select_related("customer", "created_by", "document", "invoice"),
            pk=pk,
        )
        serializer = OrderEditSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order = OrderViewerService.edit_record(
                order=order, validated_data=serializer.validated_data
            )
        except PermissionError as exc:
            return Response(
                {
                    "detail": str(exc),
                    "authorization_required": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        order = Order.objects.select_related("customer", "created_by", "document").get(pk=order.pk)
        return Response(OrderListSerializer(order, context={"request": request}).data)


class OrderUploadPdfView(APIView):
    """
    Accept a PDF or image document upload for an order.

    Supported file types: PDF, PNG, JPG, JPEG, WEBP (max 20 MB).

    POST /orders/<pk>/upload-pdf/
    Content-Type: multipart/form-data
    Body:         file=<document>

    Response 201::

        {
          "success": true,
          "marketplace": "Amazon",
          "confidence": 0.97,
          "parse_method": "gemini",
          "preview_images": ["media/document_parser/abc/product_1.png"],
          "items": [
            {
              "label": "...",
              "quantity": 1,
              "unit_price": "32.00",
              "line_total": "32.00",
              "image_url": "..."
            }
          ],
          "document": { ... }
        }
    """

    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_EXTENSIONS = frozenset([".pdf", ".png", ".jpg", ".jpeg", ".webp"])
    ALLOWED_MIMES = frozenset([
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
    ])
    MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        uploaded_file = request.FILES.get("file")

        if not uploaded_file:
            return Response(
                {"detail": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file type
        import os
        ext = os.path.splitext(uploaded_file.name.lower())[1]
        content_type = (uploaded_file.content_type or "").split(";")[0].strip().lower()

        if ext not in self.ALLOWED_EXTENSIONS and content_type not in self.ALLOWED_MIMES:
            return Response(
                {
                    "detail": (
                        f"Unsupported file type '{ext}'. "
                        "Allowed: PDF, PNG, JPG, JPEG, WEBP."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if uploaded_file.size > self.MAX_FILE_SIZE:
            return Response(
                {"detail": "File size must not exceed 20 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Step 1: Run AI parser first (before saving) for preview ──────────
        is_background = request.query_params.get("background", "false").lower() == "true"

        if is_background:
            file_content = uploaded_file.read()
            file_name = uploaded_file.name
            content_type = uploaded_file.content_type

            def process_in_background(order_id, user_id, f_content, f_name, c_type):
                import logging
                logger = logging.getLogger("apps.orders.views")
                try:
                    from django.contrib.auth import get_user_model
                    from django.core.files.uploadedfile import SimpleUploadedFile
                    from apps.orders.models import Order
                    from apps.notifications.services.notification_service import NotificationService

                    User = get_user_model()
                    user = User.objects.get(pk=user_id)
                    order_obj = Order.objects.get(pk=order_id)
                    
                    new_file = SimpleUploadedFile(name=f_name, content=f_content, content_type=c_type)
                    
                    OrderViewerService.upload_pdf(
                        order=order_obj,
                        user=user,
                        uploaded_file=new_file,
                        parse_result=None,
                    )
                    
                    NotificationService.send_order_created(order_id)
                except Exception as e:
                    logger.exception(f"Background PDF processing failed for order {order_id}: {e}")

            import threading
            thread = threading.Thread(
                target=process_in_background,
                args=(order.id, request.user.id, file_content, file_name, content_type)
            )
            thread.start()

            return Response(
                {
                    "success": True,
                    "processing": True,
                    "message": "File is being processed in the background."
                },
                status=status.HTTP_202_ACCEPTED
            )

        from apps.orders.services.ai_document_parser import AIDocumentParserService
        try:
            uploaded_file.seek(0)
            parse_result = AIDocumentParserService.parse(
                file_stream=uploaded_file,
                filename=uploaded_file.name,
            )
            uploaded_file.seek(0)
        except Exception:
            parse_result = None

        # ── Step 2: Persist document + items via service ──────────────────────
        document = OrderViewerService.upload_pdf(
            order=order,
            user=request.user,
            uploaded_file=uploaded_file,
            parse_result=parse_result,
        )

        # ── Step 3: Build rich response ────────────────────────────────────────
        doc_data = OrderDocumentSerializer(document, context={"request": request}).data

        if parse_result:
            items_preview = [
                {
                    "label": item.label,
                    "quantity": item.quantity,
                    "unit_price": str(item.unit_price),
                    "line_total": str(item.line_total),
                    "seller": item.seller,
                    "color": item.color,
                    "size": item.size,
                    "image_url": item.image_url,
                }
                for item in parse_result.items
            ]
            
            # Now that actual items are populated, send the invoice email in a background thread
            import threading
            from apps.notifications.services.notification_service import NotificationService
            threading.Thread(
                target=NotificationService.send_order_created,
                args=(order.id,),
                daemon=True
            ).start()

            return Response(
                {
                    "success": parse_result.success,
                    "marketplace": parse_result.marketplace,
                    "confidence": parse_result.confidence,
                    "parse_method": parse_result.parse_method,
                    "currency": parse_result.currency,
                    "preview_images": parse_result.preview_images,
                    "items": items_preview,
                    "document": doc_data,
                },
                status=status.HTTP_201_CREATED,
            )

        # Minimal fallback response if parser itself errored
        import threading
        from apps.notifications.services.notification_service import NotificationService
        threading.Thread(
            target=NotificationService.send_order_created,
            args=(order.id,),
            daemon=True
        ).start()

        return Response(
            {
                "success": False,
                "marketplace": "",
                "confidence": 0.0,
                "parse_method": "error",
                "preview_images": [],
                "items": [],
                "document": doc_data,
            },
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, pk):
        from apps.orders.models import OrderDocument, OrderItem
        
        order = get_object_or_404(Order, pk=pk)
        
        if hasattr(order, "document"):
            doc = order.document
            if doc.file:
                doc.file.delete(save=False)
            doc.delete()
            
        order.is_uploaded = False
        order.save(update_fields=["is_uploaded", "updated_at"])
        
        # Remove parsed items and restore fallback items total generic item
        order.items.all().delete()
        
        # Create generic fallback item
        website_label = order.website or order.website_type or "Items"
        fallback_label = f"{website_label} Shipment Package"
        qty = order.number_of_items or 1
        unit_p_awg = order.items_total / qty
        
        OrderItem.objects.create(
            order=order,
            label=fallback_label,
            quantity=qty,
            unit_price=unit_p_awg,
            line_total=order.items_total,
        )
        
        # Sync with invoice
        if hasattr(order, "invoice"):
            invoice = order.invoice
            invoice.subtotal = order.items_total
            invoice.total = order.items_total
            invoice.remaining_balance = order.remaining_balance
            invoice.save(update_fields=["subtotal", "total", "remaining_balance", "updated_at"])
            
        return Response({"success": True, "message": "Document deleted successfully."})



def _recalculate_order_totals(order):
    from decimal import Decimal
    from apps.invoices.models import Invoice
    items = order.items.all()
    if not items.exists():
        order.number_of_items = 0
        order.remaining_balance = order.items_total - order.paid_amount - order.payment_amount
        order.save(update_fields=["number_of_items", "remaining_balance"])
        
        if hasattr(order, "invoice"):
            invoice = order.invoice
            invoice.subtotal = order.items_total
            invoice.total = order.items_total
            invoice.paid = order.payment_amount
            invoice.remaining_balance = order.remaining_balance
            invoice.save(update_fields=["subtotal", "total", "paid", "remaining_balance", "updated_at"])
        return

    total_qty = sum(item.quantity for item in items)

    order.number_of_items = total_qty
    order.remaining_balance = order.items_total - order.paid_amount - order.payment_amount
    order.save(update_fields=["number_of_items", "remaining_balance"])

    if hasattr(order, "invoice"):
        invoice = order.invoice
        invoice.subtotal = order.items_total
        invoice.total = order.items_total
        invoice.paid = order.payment_amount
        invoice.remaining_balance = order.remaining_balance
        invoice.save(update_fields=["subtotal", "total", "paid", "remaining_balance", "updated_at"])


class OrderItemListView(generics.ListCreateAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = OrderItemSerializer
    pagination_class = None

    def get_queryset(self):
        order = get_object_or_404(Order, pk=self.kwargs["pk"])
        return order.items.all().order_by("id")

    def perform_create(self, serializer):
        from decimal import Decimal
        from apps.orders.services.pdf_parser import PDFInvoiceParserService

        order = get_object_or_404(Order, pk=self.kwargs["pk"])
        qty = serializer.validated_data.get("quantity", 1)
        unit_p = serializer.validated_data.get("unit_price", Decimal("0.00"))
        line_total = serializer.validated_data.get("line_total", unit_p * qty)

        image_url = serializer.validated_data.get("image_url", "")
        if not image_url:
            image_url = PDFInvoiceParserService.get_image_for_label(serializer.validated_data.get("label", ""))

        item = serializer.save(order=order, line_total=line_total, image_url=image_url)
        _recalculate_order_totals(order)


class OrderItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = OrderItemSerializer
    queryset = OrderItem.objects.all()

    def perform_update(self, serializer):
        from decimal import Decimal
        qty = serializer.validated_data.get("quantity", serializer.instance.quantity)
        unit_p = serializer.validated_data.get("unit_price", serializer.instance.unit_price)
        line_total = qty * unit_p

        # Check for status changes
        old_in_myus = serializer.instance.is_in_myus
        old_ready = serializer.instance.is_ready_for_pickup
        old_delivered = serializer.instance.is_delivered

        new_in_myus = serializer.validated_data.get("is_in_myus", old_in_myus)
        new_ready = serializer.validated_data.get("is_ready_for_pickup", old_ready)
        new_delivered = serializer.validated_data.get("is_delivered", old_delivered)

        status_changed = False
        new_status_str = ""

        if new_delivered != old_delivered and new_delivered:
            status_changed = True
            new_status_str = "Delivered"
        elif new_ready != old_ready and new_ready:
            status_changed = True
            new_status_str = "Ready for Pickup"
        elif new_in_myus != old_in_myus and new_in_myus:
            status_changed = True
            new_status_str = "Arrived at US Warehouse (In MyUS)"
        elif (new_in_myus != old_in_myus and not new_in_myus) or \
             (new_ready != old_ready and not new_ready) or \
             (new_delivered != old_delivered and not new_delivered):
            status_changed = True
            new_status_str = "Pending / Order Received"

        item = serializer.save(line_total=line_total)
        _recalculate_order_totals(item.order)

        if status_changed:
            from apps.notifications.services.email_service import EmailService
            EmailService.send_item_status_email(item, new_status_str)

    def perform_destroy(self, instance):
        order = instance.order
        instance.delete()
        _recalculate_order_totals(order)


class OrderPaymentListCreateView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        order = get_object_or_404(
            Order.objects.select_related("customer").prefetch_related(
                "payments", "payment_history"
            ),
            pk=pk,
        )
        return Response(
            {
                "customer_name": order.customer.name,
                "current_balance": str(order.remaining_balance),
                "items_total": str(order.items_total),
                "paid_amount": str(order.paid_amount),
                "payments": PaymentSerializer(order.payments.all(), many=True).data,
                "payment_history": PaymentHistorySerializer(
                    order.payment_history.all(), many=True
                ).data,
            }
        )

    def post(self, request, pk):
        order = get_object_or_404(
            Order.objects.select_related("customer", "invoice"), pk=pk
        )
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment = PaymentService.add_payment(
                order=order,
                user=request.user,
                amount=serializer.validated_data["amount"],
                payment_method=serializer.validated_data["payment_method"],
                payment_date=serializer.validated_data["payment_date"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        order.refresh_from_db()
        return Response(
            {
                "payment": PaymentSerializer(payment).data,
                "paid_amount": str(order.paid_amount),
                "remaining_balance": str(order.remaining_balance),
                "payment_history": PaymentHistorySerializer(
                    order.payment_history.all(), many=True
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )
