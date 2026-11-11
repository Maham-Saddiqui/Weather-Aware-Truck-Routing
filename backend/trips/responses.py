from rest_framework.response import Response


def no_store(response: Response) -> Response:
    """Routing and attribution answers must never be cached (SEC-08)."""
    response["Cache-Control"] = "no-store"
    return response
