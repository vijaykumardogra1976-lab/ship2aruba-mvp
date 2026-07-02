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
    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response(
                {"detail": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if uploaded_file.content_type != "application/pdf" and not uploaded_file.name.lower().endswith(
            ".pdf"
        ):
            return Response(
                {"detail": "Only PDF files are allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if uploaded_file.size > 10 * 1024 * 1024:
            return Response(
                {"detail": "File size must not exceed 10 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        document = OrderViewerService.upload_pdf(
            order=order, user=request.user, uploaded_file=uploaded_file
        )
        return Response(
            OrderDocumentSerializer(document, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


def _recalculate_order_totals(order):
    from decimal import Decimal
    items = order.items.all()
    if not items.exists():
        order.number_of_items = 0
        order.items_total = Decimal("0.00")
        order.amount_usd = Decimal("0.00")
        order.remaining_balance = Decimal("0.00")
        order.save(update_fields=["number_of_items", "items_total", "amount_usd", "remaining_balance"])
        return

    total_qty = sum(item.quantity for item in items)
    total_awg = sum(item.line_total for item in items)

    usd_val = Decimal(str(order.amount_usd))
    awg_val = Decimal(str(order.items_total))
    rate = awg_val / usd_val if usd_val > 0 else Decimal("1.75")
    if rate <= 0:
        rate = Decimal("1.75")

    total_usd = (total_awg / rate).quantize(Decimal("0.01"))

    order.number_of_items = total_qty
    order.items_total = total_awg
    order.amount_usd = total_usd
    order.remaining_balance = total_awg - order.paid_amount
    order.save(update_fields=["number_of_items", "items_total", "amount_usd", "remaining_balance"])


class OrderItemListView(generics.ListCreateAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = OrderItemSerializer
    pagination_class = None

    def get_queryset(self):
        order = get_object_or_404(Order, pk=self.kwargs["pk"])
        return order.items.all()

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
