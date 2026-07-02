from django.urls import path

from apps.orders.client_views import (
    ClientDashboardView,
    ClientOrderDetailView,
    ClientOrderListView,
    ClientPaymentsView,
)

urlpatterns = [
    path("dashboard/", ClientDashboardView.as_view(), name="client-dashboard"),
    path("orders/", ClientOrderListView.as_view(), name="client-order-list"),
    path("orders/<int:pk>/", ClientOrderDetailView.as_view(), name="client-order-detail"),
    path("payments/", ClientPaymentsView.as_view(), name="client-payments"),
]
