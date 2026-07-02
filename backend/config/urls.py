from django.contrib import admin
from django.urls import include, path

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    # Staff auth
    path("api/auth/", include("apps.authentication.urls")),
    # Client auth (OTP-based)
    path("api/client/auth/", include("apps.authentication.client_urls")),
    # Staff API
    path("api/customers/", include("apps.customers.urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/invoices/", include("apps.invoices.urls")),
    # Client API
    path("api/client/", include("apps.orders.client_urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
