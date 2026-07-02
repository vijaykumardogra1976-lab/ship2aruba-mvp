class WebsiteType:
    AMAZON = "amazon"
    EBAY = "ebay"
    OTHER = "other"

    CHOICES = [
        (AMAZON, "Amazon"),
        (EBAY, "eBay"),
        (OTHER, "Other"),
    ]


class PaymentType:
    ONE = "one"
    TWO = "two"

    CHOICES = [
        (ONE, "One Payment"),
        (TWO, "Two Payments"),
    ]


class PaymentMethod:
    CASH = "cash"
    PIN = "pin"
    TRANSFER = "transfer"

    CHOICES = [
        (CASH, "Cash"),
        (PIN, "PIN"),
        (TRANSFER, "Transfer"),
    ]


class OrderStatus:
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    PROCESSING = "processing"
    READY_FOR_PICKUP = "ready_for_pickup"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

    CHOICES = [
        (PENDING_APPROVAL, "Pending Approval"),
        (APPROVED, "Approved"),
        (PROCESSING, "Processing"),
        (READY_FOR_PICKUP, "Ready For Pickup"),
        (COMPLETED, "Completed"),
        (CANCELLED, "Cancelled"),
    ]
