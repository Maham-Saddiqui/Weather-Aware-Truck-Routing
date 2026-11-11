from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from config import container
from domain.types import GeoPoint
from providers.timezone.offline import TimeZoneNotFound
from services.compare_trip import plan_compare_trip
from services.primary_trip import plan_primary_trip
from trips.presenters import present_compare, present_primary
from trips.responses import no_store
from trips.serializers import TimeZoneQuerySerializer, parse_trip_request

NO_TIME_ZONE = "No time zone covers this place. Choose a place on land."


class HealthView(APIView):
    """Liveness check, also used by the keep-warm ping. The only endpoint that is not throttled."""

    throttle_classes = ()

    def get(self, request: Request) -> Response:
        return Response({"status": "ok"})


class AttributionView(APIView):
    def get(self, request: Request) -> Response:
        credit = container.providers().attribution.routing_copyright()
        return no_store(Response({"routing_copyright": credit}))


class TimeZoneView(APIView):
    def get(self, request: Request) -> Response:
        query = TimeZoneQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        point = GeoPoint(query.validated_data["lat"], query.validated_data["lon"])
        try:
            zone = container.providers().trips.timezone.zone_name(point)
        except TimeZoneNotFound:
            raise ValidationError({"lat": [NO_TIME_ZONE]}) from None
        return Response({"time_zone": zone})


class PrimaryTripView(APIView):
    def post(self, request: Request) -> Response:
        providers = container.providers()
        trip = parse_trip_request(request.data, providers.clock())
        answer = providers.trip_runner.run(
            lambda: present_primary(plan_primary_trip(providers.trips, trip))
        )
        return no_store(Response(answer))


class CompareTripView(APIView):
    def post(self, request: Request) -> Response:
        providers = container.providers()
        trip = parse_trip_request(request.data, providers.clock())
        answer = providers.trip_runner.run(
            lambda: present_compare(plan_compare_trip(providers.trips, trip))
        )
        return no_store(Response(answer))
