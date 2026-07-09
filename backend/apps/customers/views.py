from django.db.models import Q, Count
from rest_framework import generics
from rest_framework.response import Response

from apps.common.permissions import IsStaffUser
from apps.customers.models import Customer
from apps.customers.serializers import CustomerCreateSerializer, CustomerSerializer


class CustomerListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsStaffUser]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CustomerCreateSerializer
        return CustomerSerializer

    def get_queryset(self):
        queryset = Customer.objects.annotate(orders_count=Count("orders"))
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        output = CustomerSerializer(serializer.instance)
        return Response(output.data, status=201)
