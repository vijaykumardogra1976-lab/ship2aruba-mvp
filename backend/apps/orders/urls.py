from django.urls import path

from apps.orders.views import (
    OrderDetailView,
    OrderEditView,
    OrderInvoiceView,
    OrderItemListView,
    OrderItemDetailView,
    OrderListCreateView,
    OrderPaymentListCreateView,
    OrderStatusToggleView,
    OrderUploadPdfView,
)

urlpatterns = [
    path("", OrderListCreateView.as_view(), name="order-list-create"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("<int:pk>/invoice/", OrderInvoiceView.as_view(), name="order-invoice"),
    path("<int:pk>/status/", OrderStatusToggleView.as_view(), name="order-status-toggle"),
    path("<int:pk>/edit/", OrderEditView.as_view(), name="order-edit"),
    path("<int:pk>/upload-pdf/", OrderUploadPdfView.as_view(), name="order-upload-pdf"),
    path("<int:pk>/items/", OrderItemListView.as_view(), name="order-items"),
    path("items/<int:pk>/", OrderItemDetailView.as_view(), name="order-item-detail"),
    path("<int:pk>/payments/", OrderPaymentListCreateView.as_view(), name="order-payments"),
]
