from apps.common.pagination import StandardPagination


class OrderListPagination(StandardPagination):
    page_size = 100
    max_page_size = 1000
