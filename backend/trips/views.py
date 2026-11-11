from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Liveness check, also used by the keep-warm ping."""

    def get(self, request: Request) -> Response:
        return Response({"status": "ok"})
