from dataclasses import dataclass, replace

from domain.dedupe import ShapeBook, choose_variety, drop_near_duplicates
from domain.types import ProviderRoute
from domain.units import vehicle_weight_kg
from providers.routing.port import (
    RoutePreference,
    RouteQuery,
    RoutingError,
    RoutingProvider,
    RoutingProviderName,
    RoutingUnavailable,
)
from services.environment import TripEnvironment
from services.trip_request import TripRequest

MAX_ROUTES_SHOWN = 3
ALTERNATIVES_REQUESTED = 3


@dataclass(frozen=True, slots=True)
class RoutedRoutes:
    """Routes from one provider only: TomTom and Valhalla are never mixed (architecture 6)."""

    provider: RoutingProviderName
    routes: tuple[ProviderRoute, ...]


def route_primary(env: TripEnvironment, request: TripRequest) -> RoutedRoutes:
    """One fastest call without alternatives; any outage or a spent daily budget uses the backup."""
    query = _query(env, request, RoutePreference.FASTEST, max_alternatives=0)
    if env.call_guard.try_acquire():
        try:
            return RoutedRoutes(env.routing.name, env.routing.routes(query))
        except RoutingUnavailable:
            pass
    return RoutedRoutes(env.backup_routing.name, env.backup_routing.routes(query))


def route_compare(env: TripEnvironment, request: TripRequest) -> RoutedRoutes:
    """Fastest and eco run side by side; eco is awaited only if fastest lacks variety."""
    fastest = _query(env, request, RoutePreference.FASTEST, ALTERNATIVES_REQUESTED)
    if not env.call_guard.try_acquire():
        return _from_backup(env.backup_routing, fastest)
    fastest_call = env.executor.submit(env.routing.routes, fastest)
    eco_call = env.executor.submit(
        _eco_routes, env, replace(fastest, preference=RoutePreference.ECO)
    )
    shapes = ShapeBook()
    try:
        distinct = drop_near_duplicates(fastest_call.result(), shapes)
    except RoutingUnavailable:
        eco_call.cancel()
        return _from_backup(env.backup_routing, fastest)
    if len(distinct) < MAX_ROUTES_SHOWN:
        distinct = drop_near_duplicates((*distinct, *eco_call.result()), shapes)
    return RoutedRoutes(env.routing.name, choose_variety(distinct, MAX_ROUTES_SHOWN, shapes))


def _eco_routes(env: TripEnvironment, query: RouteQuery) -> tuple[ProviderRoute, ...]:
    """Extra routes are a bonus: if this call fails or is not allowed, fastest still answers."""
    if not env.call_guard.try_acquire():
        return ()
    try:
        return env.routing.routes(query)
    except RoutingError:
        return ()


def _from_backup(backup: RoutingProvider, query: RouteQuery) -> RoutedRoutes:
    routes = drop_near_duplicates(backup.routes(query))
    return RoutedRoutes(backup.name, choose_variety(routes, MAX_ROUTES_SHOWN))


def _query(
    env: TripEnvironment, request: TripRequest, preference: RoutePreference, max_alternatives: int
) -> RouteQuery:
    """The current hour is a valid departure (RR-29) but may be minutes ago; providers get now."""
    return RouteQuery(
        origin=request.origin,
        destination=request.destination,
        depart_at=max(request.departure_utc, env.clock()),
        vehicle_weight_kg=vehicle_weight_kg(request.load_lb),
        preference=preference,
        max_alternatives=max_alternatives,
    )
