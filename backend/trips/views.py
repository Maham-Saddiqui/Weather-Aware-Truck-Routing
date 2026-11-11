from rest_framework.exceptions import ValidationError
from rest_framework.parsers import JSONParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from config import container
from domain.types import GeoPoint
from providers.routing.port import RoutingUnavailable
from providers.timezone.offline import TimeZoneNotFound
from services.compare_trip import plan_compare_trip
from services.primary_trip import plan_primary_trip
from trips.limits import ATTRIBUTION_THROTTLE_SCOPE, TRIP_THROTTLE_SCOPE
from trips.presenters import present_compare, present_primary
from trips.responses import no_store
from trips.serializers import TimeZoneQuerySerializer, parse_trip_request
from trips.trip_summary import summarized

NO_TIME_ZONE = "No time zone covers this place. Choose a place on land."


class HealthView(APIView):
    """Liveness check, also used by the keep-warm ping. The only endpoint that is not throttled."""

    throttle_classes = ()

    def get(self, request: Request) -> Response:
        return Response({"status": "ok"})


class AttributionView(APIView):
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = ATTRIBUTION_THROTTLE_SCOPE

    def get(self, request: Request) -> Response:
        providers = container.providers()
        if not providers.trips.call_guard.try_acquire():
            raise RoutingUnavailable("The daily routing budget is spent")
        credit = providers.attribution.routing_copyright()
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
    parser_classes = (JSONParser,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = TRIP_THROTTLE_SCOPE

    def post(self, request: Request) -> Response:
        return summarized("primary", lambda: self._answer(request))

    def _answer(self, request: Request) -> Response:
        providers = container.providers()
        trip = parse_trip_request(request.data, providers.clock())
        answer = providers.trip_runner.run(
            lambda: present_primary(plan_primary_trip(providers.trips, trip))
        )
        return no_store(Response(answer))


class CompareTripView(APIView):
    parser_classes = (JSONParser,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = TRIP_THROTTLE_SCOPE

    def post(self, request: Request) -> Response:
        return summarized("compare", lambda: self._answer(request))

    def _answer(self, request: Request) -> Response:
        providers = container.providers()
        trip = parse_trip_request(request.data, providers.clock())
        answer = providers.trip_runner.run(
            lambda: present_compare(plan_compare_trip(providers.trips, trip))
        )
        return no_store(Response(answer))
