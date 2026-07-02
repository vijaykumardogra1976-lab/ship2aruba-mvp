from django.urls import path
from . import client_views

urlpatterns = [
    path("signup/", client_views.ClientSignupView.as_view(), name="client-signup"),
    path("login/", client_views.ClientLoginView.as_view(), name="client-login"),
    path("me/", client_views.ClientMeView.as_view(), name="client-me"),
]
