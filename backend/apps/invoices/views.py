from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsStaffUser
from apps.invoices.models import Invoice
from apps.invoices.services.invoice_service import InvoiceService


class InvoiceDetailView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        invoice = get_object_or_404(
            Invoice.objects.select_related("order", "order__customer"), pk=pk
        )
        return Response(InvoiceService.to_dict(invoice))
