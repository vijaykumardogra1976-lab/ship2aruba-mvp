from datetime import date
from decimal import Decimal
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import User, UserRole
from apps.common.enums import PaymentMethod, PaymentType, WebsiteType
from apps.customers.models import Customer
from apps.orders.models import Order, OrderItem
from apps.orders.services.order_service import OrderService


class OrdersViewerAPITestCase(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="staff@ship2aruba.com",
            password="testpass123",
            first_name="Ashley",
            last_name="Staff",
            role=UserRole.STAFF,
        )
        self.customer = Customer.objects.create(
            name="Sharleen Anthony",
            phone="5610542",
            email="sharleen@example.com",
            created_by=self.staff,
        )
        self.order = OrderService.create_order(
            user=self.staff,
            validated_data={
                "customer_id": self.customer.id,
                "website_type": WebsiteType.AMAZON,
                "website": "amazon.com",
                "order_date": date(2026, 6, 30),
                "number_of_items": 5,
                "amount_usd": Decimal("150.00"),
                "payment_type": PaymentType.TWO,
                "payment_amount": Decimal("250.00"),
                "items_total": Decimal("500.00"),
                "paid_amount": Decimal("250.00"),
                "payment_method": PaymentMethod.TRANSFER,
                "is_new_client": False,
                "is_urgent": True,
                "internal_notes": "Internal note preview",
                "client_notes": "",
            },
        )
        self.item = self.order.items.first()
        self.item.tracking_number = "TRACK123"
        self.item.fedex_tracking_number = "FEDEX456"
        self.item.save()
        self.client.force_authenticate(user=self.staff)

    def test_list_orders(self):
        response = self.client.get("/api/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        result = response.data["results"][0]
        self.assertEqual(result["order_number"], self.order.order_number)
        self.assertEqual(result["customer"]["name"], "Sharleen Anthony")
        self.assertEqual(result["placed_by"]["full_name"], "Ashley Staff")

    def test_filter_by_customer(self):
        response = self.client.get(f"/api/orders/?customer={self.customer.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_filter_by_order_search(self):
        response = self.client.get(f"/api/orders/?search={self.order.order_number}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_filter_by_item_tracking(self):
        response = self.client.get("/api/orders/?search=FEDEX456")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_filter_by_item_tracking_legacy_param(self):
        response = self.client.get("/api/orders/?search_items=FEDEX456")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_patch_status_toggle(self):
        response = self.client.patch(
            f"/api/orders/{self.order.id}/status/",
            {"is_az_ordered": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_az_ordered"])
        self.order.refresh_from_db()
        self.assertTrue(self.order.is_az_ordered)

    @override_settings(ORDER_EDIT_AUTHORIZATION_PASSWORD="secret123")
    def test_edit_record_requires_password(self):
        response = self.client.patch(
            f"/api/orders/{self.order.id}/edit/",
            {
                "items_total": "600.00",
                "authorization_password": "wrong",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(response.data["authorization_required"])

    @override_settings(ORDER_EDIT_AUTHORIZATION_PASSWORD="secret123")
    def test_edit_record_success(self):
        response = self.client.patch(
            f"/api/orders/{self.order.id}/edit/",
            {
                "items_total": "600.00",
                "amount_usd": "175.00",
                "order_date": "2026-07-01",
                "authorization_password": "secret123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.items_total, Decimal("600.00"))
        self.assertEqual(self.order.amount_usd, Decimal("175.00"))
        self.assertEqual(self.order.remaining_balance, Decimal("350.00"))

    def test_delete_order(self):
        order_id = self.order.id
        response = self.client.delete(f"/api/orders/{order_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Order.objects.filter(pk=order_id).exists())

    def test_upload_pdf(self):
        pdf_content = b"%PDF-1.4 test content"
        upload = SimpleUploadedFile(
            "invoice.pdf", pdf_content, content_type="application/pdf"
        )
        response = self.client.post(
            f"/api/orders/{self.order.id}/upload-pdf/",
            {"file": upload},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.order.refresh_from_db()
        self.assertTrue(self.order.is_uploaded)
        self.assertTrue(hasattr(self.order, "document"))

    def test_get_items(self):
        response = self.client.get(f"/api/orders/{self.order.id}/items/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["tracking_number"], "TRACK123")

    def test_get_payments(self):
        response = self.client.get(f"/api/orders/{self.order.id}/payments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["customer_name"], "Sharleen Anthony")
        self.assertEqual(response.data["current_balance"], "250.00")
        self.assertGreaterEqual(len(response.data["payments"]), 1)

    def test_add_payment(self):
        response = self.client.post(
            f"/api/orders/{self.order.id}/payments/",
            {
                "payment_date": "2026-07-01",
                "amount": "100.00",
                "payment_method": PaymentMethod.CASH,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.order.refresh_from_db()
        self.assertEqual(self.order.paid_amount, Decimal("350.00"))
        self.assertEqual(self.order.remaining_balance, Decimal("150.00"))

    def test_create_order_still_works(self):
        response = self.client.post(
            "/api/orders/",
            {
                "customer_id": self.customer.id,
                "website_type": WebsiteType.AMAZON,
                "website": "amazon.com",
                "order_date": "2026-07-02",
                "number_of_items": 2,
                "amount_usd": "50.00",
                "payment_type": PaymentType.ONE,
                "payment_amount": "100.00",
                "items_total": "100.00",
                "paid_amount": "100.00",
                "payment_method": PaymentMethod.CASH,
                "is_new_client": False,
                "is_urgent": False,
                "internal_notes": "",
                "client_notes": "",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
