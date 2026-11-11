from dataclasses import replace

from domain.ranking import Candidate, rank_routes
from services.environment import TripEnvironment
from services.results import CompareTripResult
from services.routing_choice import route_compare
from services.trip_rating import rate_routes
from services.trip_request import TripRequest


def plan_compare_trip(env: TripEnvironment, request: TripRequest) -> CompareTripResult:
    """Up to 3 distinct routes, rated, ranked and recommended (RR-22 to RR-26)."""
    routed = route_compare(env, request)
    rated = rate_routes(env, request, routed.routes)
    ranking = rank_routes([Candidate(route.route_id, route.summary) for route in rated.routes])
    by_id = {route.route_id: route for route in rated.routes}
    in_display_order = tuple(
        replace(by_id[entry.route_id], rank=entry.rank) for entry in ranking.display_order
    )
    return CompareTripResult(
        routes=in_display_order,
        recommendation=ranking.recommendation,
        heatmap=rated.heatmap,
        routing_provider=routed.provider,
        weather_status=rated.weather_status,
    )
