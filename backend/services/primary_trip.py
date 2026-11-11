from services.environment import TripEnvironment
from services.results import PrimaryTripResult
from services.routing_choice import route_primary
from services.trip_rating import rate_routes
from services.trip_request import TripRequest


def plan_primary_trip(env: TripEnvironment, request: TripRequest) -> PrimaryTripResult:
    """The fast first answer: one route call, one weather call (architecture section 4)."""
    routed = route_primary(env, request)
    rated = rate_routes(env, request, routed.routes[:1])
    return PrimaryTripResult(rated.routes[0], rated.heatmap, routed.provider, rated.weather_status)
