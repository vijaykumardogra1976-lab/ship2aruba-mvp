from django.urls import path

from apps.customers.views import CustomerListCreateView

urlpatterns = [
    path("", CustomerListCreateView.as_view(), name="customer-list-create"),
]
