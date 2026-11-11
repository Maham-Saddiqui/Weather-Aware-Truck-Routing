from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from config import container
from domain.types import GeoPoint
from trips.responses import no_store
from trips.serializers import TimeZoneQuerySerializer


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
        return Response({"time_zone": container.providers().timezone.zone_name(point)})
