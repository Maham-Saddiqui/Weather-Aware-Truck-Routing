from django.urls import URLPattern, path

from trips.views import HealthView

urlpatterns: list[URLPattern] = [
    path("health", HealthView.as_view()),
]
