from django.urls import path

from apps.authentication.client_views import (
    ClientMeView,
    ClientOTPRequestView,
    ClientOTPVerifyView,
    ClientSetPasswordView,
)

urlpatterns = [
    path("otp/request/", ClientOTPRequestView.as_view(), name="client-otp-request"),
    path("otp/verify/", ClientOTPVerifyView.as_view(), name="client-otp-verify"),
    path("set-password/", ClientSetPasswordView.as_view(), name="client-set-password"),
    path("me/", ClientMeView.as_view(), name="client-me"),
]
