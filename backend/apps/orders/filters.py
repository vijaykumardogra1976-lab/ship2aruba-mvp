from django.db.models import Q
import django_filters

from apps.orders.models import Order


class OrderFilter(django_filters.FilterSet):
    customer = django_filters.NumberFilter(field_name="customer_id")
    search = django_filters.CharFilter(method="filter_search")
    search_items = django_filters.CharFilter(method="filter_search_items")

    class Meta:
        model = Order
        fields = ("customer", "search", "search_items")

    def filter_search(self, queryset, name, value):
        value = value.strip()
        if not value:
            return queryset

        q = Q(order_number__icontains=value)
        q |= Q(items__tracking_number__icontains=value)
        q |= Q(items__fedex_tracking_number__icontains=value)

        if value.isdigit():
            numeric = int(value)
            q |= Q(pk=numeric)
            q |= Q(order_number__endswith=value.zfill(6))
            q |= Q(order_number__endswith=value)

        return queryset.filter(q).distinct()

    def filter_search_items(self, queryset, name, value):
        value = value.strip()
        if not value:
            return queryset
        return queryset.filter(
            Q(items__tracking_number__icontains=value)
            | Q(items__fedex_tracking_number__icontains=value)
        ).distinct()
