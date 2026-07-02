from django.utils import timezone


def generate_order_number():
    from apps.orders.models import Order

    year = timezone.now().year
    prefix = f"ORD-{year}-"
    last = (
        Order.objects.filter(order_number__startswith=prefix)
        .order_by("-order_number")
        .first()
    )
    if last:
        try:
            seq = int(last.order_number.split("-")[-1]) + 1
        except ValueError:
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:06d}"


def generate_invoice_number():
    from apps.invoices.models import Invoice

    year = timezone.now().year
    prefix = f"INV-{year}-"
    last = (
        Invoice.objects.filter(invoice_number__startswith=prefix)
        .order_by("-invoice_number")
        .first()
    )
    if last:
        try:
            seq = int(last.invoice_number.split("-")[-1]) + 1
        except ValueError:
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:06d}"
