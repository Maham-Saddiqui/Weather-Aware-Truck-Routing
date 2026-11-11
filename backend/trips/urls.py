from django.urls import URLPattern, path

from trips.views import (
    AttributionView,
    CompareTripView,
    HealthView,
    PrimaryTripView,
    TimeZoneView,
)

urlpatterns: list[URLPattern] = [
    path("health", HealthView.as_view()),
    path("attribution", AttributionView.as_view()),
    path("timezone", TimeZoneView.as_view()),
    path("trips/primary", PrimaryTripView.as_view()),
    path("trips/compare", CompareTripView.as_view()),
]
