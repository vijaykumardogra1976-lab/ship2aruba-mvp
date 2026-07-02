from django.core.management.base import BaseCommand

from apps.authentication.models import User, UserRole
from apps.customers.models import Customer


class Command(BaseCommand):
    help = "Seed development data"

    def handle(self, *args, **options):
        if not User.objects.filter(email="staff@ship2aruba.com").exists():
            User.objects.create_user(
                email="staff@ship2aruba.com",
                password="staff1234",
                first_name="Staff",
                last_name="User",
                role=UserRole.STAFF,
                is_staff=True,
            )
            self.stdout.write(self.style.SUCCESS("Created staff user: staff@ship2aruba.com / staff1234"))

        staff = User.objects.get(email="staff@ship2aruba.com")
        customers = [
            ("Sharleen Anthony", "5610542", "sharseny2001@gmail.com"),
            ("Francis Semerel", "566-4282", "francisanthonysemerel@yahoo.com"),
            ("Anthony Ferdinand", "5922246", "anthony.martina@pcdoctorsaruba.com"),
            ("Anthony Croes", "566-8047", "ckac1996@gmail.com"),
            ("Cool Breeze Aircon", "5921854", None),
        ]
        for name, phone, email in customers:
            Customer.objects.get_or_create(
                name=name,
                phone=phone,
                defaults={"email": email, "created_by": staff},
            )
        self.stdout.write(self.style.SUCCESS("Seed data complete."))
