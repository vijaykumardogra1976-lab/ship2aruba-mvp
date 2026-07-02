from django.urls import path

from apps.invoices.views import InvoiceDetailView

urlpatterns = [
    path("<int:pk>/", InvoiceDetailView.as_view(), name="invoice-detail"),
]
