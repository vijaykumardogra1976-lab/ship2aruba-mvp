"""
Client-facing order views.

All views require role=CUSTOMER and authentication.
Returns only data belonging to this customer.

Endpoints:
  GET /api/client/dashboard/         — stats + recent orders + monthly chart data
  GET /api/client/orders/            — paginated + filtered order list
  GET /api/client/orders/{id}/       — full order detail
  GET /api/client/payments/          — outstanding balance + payment history
"""

import logging
from collections import defaultdict
from datetime import timedelta

from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.models import UserRole
from apps.common.enums import OrderStatus
from apps.invoices.services.invoice_service import InvoiceService
from apps.orders.models import Order
from apps.payments.models import Payment

logger = logging.getLogger("apps.orders")

# ─── Status helpers ──────────────────────────────────────────────────────────
STATUS_LABELS = {
    OrderStatus.PENDING_APPROVAL: "Order Received",   # client-friendly: we got your order
    OrderStatus.APPROVED: "Confirmed",                # staff confirmed it
    OrderStatus.PROCESSING: "Processing",             # being worked on
    OrderStatus.READY_FOR_PICKUP: "Ready for Pickup", # in Aruba, awaiting pickup
    OrderStatus.COMPLETED: "Delivered",               # done
    OrderStatus.CANCELLED: "Cancelled",
}

STATUS_COLORS = {
    OrderStatus.PENDING_APPROVAL: "blue",    # neutral/info — not alarming
    OrderStatus.APPROVED: "violet",
    OrderStatus.PROCESSING: "violet",
    OrderStatus.READY_FOR_PICKUP: "orange",
    OrderStatus.COMPLETED: "green",
    OrderStatus.CANCELLED: "red",
}

WEBSITE_ICONS = {
    "amazon": "amazon",
    "ebay": "ebay",
    "other": "other",
}


def _get_customer_for_user(user):
    return user.customer_profile.first()


def _serialize_order(order) -> dict:
    raw_status = order.current_status or OrderStatus.PENDING_APPROVAL
    try:
        invoice_number = order.invoice.invoice_number
    except Exception:
        invoice_number = None

    status = raw_status
    is_received = True
    is_paid = order.paid_amount > 0 or status in [OrderStatus.APPROVED, OrderStatus.PROCESSING, OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED]
    
    # If the order is a procurement (Amazon/eBay), it requires the purchased flag. 
    # Otherwise (other forwarding), it's purchased automatically.
    is_purchased = is_paid and (
        order.is_az_ordered or 
        order.website_type not in ["amazon", "ebay"] or 
        status in [OrderStatus.PROCESSING, OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED]
    )
    
    is_in_warehouse = is_purchased and (order.is_in_myus or status in [OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED])
    is_packed = is_in_warehouse and (order.is_uploaded or status in [OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED])
    is_shipped = is_packed and (status in [OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED])
    is_customs = is_shipped and (status in [OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED])
    is_out_for_delivery = is_customs and (status in [OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED])
    is_delivered = is_out_for_delivery and (status == OrderStatus.COMPLETED or order.is_completed)

    return {
        "id": order.id,
        "order_number": order.order_number,
        "order_date": order.order_date,
        "created_at": order.created_at,
        "website": order.website,
        "website_type": order.website_type,
        "number_of_items": order.number_of_items,
        "amount_usd": str(order.amount_usd),
        "items_total": str(order.items_total),
        "paid_amount": str(order.paid_amount),
        "remaining_balance": str(order.remaining_balance),
        "payment_method": order.payment_method,
        "is_urgent": order.is_urgent,
        "client_notes": order.client_notes,
        "current_status": raw_status,
        "status_label": STATUS_LABELS.get(raw_status, raw_status),
        "status_color": STATUS_COLORS.get(raw_status, "gray"),
        "progress": {
            "order_received": is_received,
            "payment_confirmed": is_paid,
            "purchased": is_purchased,
            "arrived_warehouse": is_in_warehouse,
            "packing": is_packed,
            "shipped": is_shipped,
            "customs": is_customs,
            "out_for_delivery": is_out_for_delivery,
            "delivered": is_delivered,
        },
        "invoice_number": invoice_number,
        "items": [
            {
                "id": item.id,
                "label": item.label,
                "quantity": item.quantity,
                "unit_price": str(item.unit_price),
                "line_total": str(item.line_total),
                "tracking_number": item.tracking_number,
                "fedex_tracking_number": item.fedex_tracking_number,
                "image_url": item.image_url,
            }
            for item in order.items.all()
        ]
    }


class ClientOrderPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


# ─── Dashboard ────────────────────────────────────────────────────────────────

class ClientDashboardView(APIView):
    """
    GET /api/client/dashboard/
    Returns:
      - stats: active, in_transit, delivered, pending_payment counts + totals
      - monthly_orders: last 6 months count for sparkline chart
      - recent_orders: last 5 orders
      - payment_due: total outstanding balance
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != UserRole.CUSTOMER:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        customer = _get_customer_for_user(request.user)
        if not customer:
            return Response({
                "stats": {"active": 0, "in_transit": 0, "delivered": 0, "pending_payment": 0},
                "monthly_orders": [],
                "recent_orders": [],
                "payment_due": "0.00",
            })

        orders = Order.objects.filter(customer=customer)

        # --- Stats ---
        active = orders.filter(
            current_status__in=[
                OrderStatus.PENDING_APPROVAL,
                OrderStatus.APPROVED,
                OrderStatus.PROCESSING,
            ]
        ).count()
        in_transit = orders.filter(
            current_status=OrderStatus.READY_FOR_PICKUP
        ).count()
        delivered = orders.filter(current_status=OrderStatus.COMPLETED).count()

        # Orders with outstanding balance
        pending_payment_count = orders.filter(remaining_balance__gt=0).count()
        total_outstanding = orders.aggregate(total=Sum("remaining_balance"))["total"] or 0

        # --- Monthly chart: last 6 months ---
        now = timezone.now()
        monthly_data = []
        for i in range(5, -1, -1):
            month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            if i == 0:
                month_end = now
            else:
                month_end = (month_start + timedelta(days=32)).replace(day=1)

            count = orders.filter(created_at__gte=month_start, created_at__lt=month_end).count()
            monthly_data.append({
                "month": month_start.strftime("%b"),
                "orders": count,
            })

        # --- Recent orders (last 5) ---
        recent = orders.select_related("invoice").order_by("-created_at")[:5]
        recent_serialized = [_serialize_order(o) for o in recent]

        return Response({
            "stats": {
                "active": active,
                "in_transit": in_transit,
                "delivered": delivered,
                "pending_payment": pending_payment_count,
                "total": orders.count(),
                "cancelled": orders.filter(current_status=OrderStatus.CANCELLED).count(),
            },
            "monthly_orders": monthly_data,
            "recent_orders": recent_serialized,
            "payment_due": str(total_outstanding),
        })


# ─── Orders ──────────────────────────────────────────────────────────────────

class ClientOrderListView(APIView):
    """
    GET /api/client/orders/
    Query params: status, website_type, search, ordering
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != UserRole.CUSTOMER:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        customer = _get_customer_for_user(request.user)
        if not customer:
            return Response({"results": [], "count": 0})

        queryset = Order.objects.filter(customer=customer).select_related("invoice")

        # Filters
        status_filter = request.query_params.get("status")
        if status_filter and status_filter != "all":
            queryset = queryset.filter(current_status=status_filter)

        website_filter = request.query_params.get("website_type")
        if website_filter:
            queryset = queryset.filter(website_type=website_filter)

        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(order_number__icontains=search) | Q(website__icontains=search)
            )

        ordering = request.query_params.get("ordering", "-created_at")
        if ordering in ["created_at", "-created_at", "amount_usd", "-amount_usd", "order_date", "-order_date"]:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by("-created_at")

        paginator = ClientOrderPagination()
        page = paginator.paginate_queryset(queryset, request)
        data = [_serialize_order(o) for o in page]
        return paginator.get_paginated_response(data)


class ClientOrderDetailView(APIView):
    """GET /api/client/orders/{id}/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if request.user.role != UserRole.CUSTOMER:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        customer = _get_customer_for_user(request.user)
        if not customer:
            return Response({"detail": "Customer profile not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            order = Order.objects.select_related("invoice").get(pk=pk, customer=customer)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        data = _serialize_order(order)

        # Add invoice detail if available
        try:
            if order.invoice:
                invoice_ctx = InvoiceService.build_context(order.invoice)
                data["invoice_detail"] = {
                    "invoice_number": invoice_ctx["invoice_number"],
                    "issued_at": str(invoice_ctx.get("issued_at", "")),
                    "subtotal": str(invoice_ctx.get("subtotal", 0)),
                    "total": str(invoice_ctx.get("total", 0)),
                    "paid": str(invoice_ctx.get("paid", 0)),
                    "remaining_balance": str(invoice_ctx.get("remaining_balance", 0)),
                    "payment_method": invoice_ctx.get("payment_method", ""),
                }
        except Exception:
            pass

        # Add payment history for this order
        payments = Payment.objects.filter(order=order).order_by("paid_at")
        data["payments"] = [
            {
                "id": p.id,
                "amount": str(p.amount),
                "method": p.payment_method,
                "paid_at": p.paid_at,
                "sequence": p.sequence,
            }
            for p in payments
        ]

        return Response(data)


# ─── Payments ─────────────────────────────────────────────────────────────────

class ClientPaymentsView(APIView):
    """
    GET /api/client/payments/
    Returns outstanding balance + full payment history across all orders.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != UserRole.CUSTOMER:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        customer = _get_customer_for_user(request.user)
        if not customer:
            return Response({"outstanding": "0.00", "history": []})

        orders = Order.objects.filter(customer=customer)
        total_outstanding = orders.aggregate(total=Sum("remaining_balance"))["total"] or 0

        # Payment history across all orders
        payments = (
            Payment.objects.filter(order__customer=customer)
            .select_related("order")
            .order_by("-paid_at")
        )

        history = [
            {
                "id": p.id,
                "order_id": p.order_id,
                "order_number": p.order.order_number,
                "amount": str(p.amount),
                "method": p.payment_method,
                "paid_at": p.paid_at,
            }
            for p in payments
        ]

        # Orders with outstanding balance (for "pending" section)
        pending_orders = orders.filter(remaining_balance__gt=0).order_by("-created_at")[:10]
        pending = [
            {
                "id": o.id,
                "order_number": o.order_number,
                "items_total": str(o.items_total),
                "paid_amount": str(o.paid_amount),
                "remaining_balance": str(o.remaining_balance),
                "current_status": o.current_status,
                "status_label": STATUS_LABELS.get(o.current_status, o.current_status),
                "order_date": o.order_date,
                "number_of_items": o.number_of_items,
            }
            for o in pending_orders
        ]

        return Response({
            "outstanding": str(total_outstanding),
            "pending_orders": pending,
            "history": history,
        })
