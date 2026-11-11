from django.urls import URLPattern, path

from trips.views import AttributionView, HealthView, TimeZoneView

urlpatterns: list[URLPattern] = [
    path("health", HealthView.as_view()),
    path("attribution", AttributionView.as_view()),
    path("timezone", TimeZoneView.as_view()),
]
