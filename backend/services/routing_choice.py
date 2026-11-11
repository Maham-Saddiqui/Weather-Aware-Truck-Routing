import time
from collections.abc import Callable
from concurrent.futures import Future
from contextvars import copy_context
from dataclasses import dataclass, replace

from domain.dedupe import ShapeBook, choose_variety, drop_near_duplicates
from domain.types import ProviderRoute
from domain.units import vehicle_weight_kg
from providers.event_log import elapsed_ms, log_guard_spent
from providers.http import one_attempt
from providers.routing.port import (
    RoutePreference,
    RouteQuery,
    RoutingError,
    RoutingProvider,
    RoutingProviderName,
    RoutingUnavailable,
)
from providers.trip_notes import current_notes, stage
from services.environment import TripEnvironment
from services.trip_class import MAX_ROUTES_SHOWN, TripClass, classify
from services.trip_request import TripRequest

BACKUP_GUARD_SPENT = "daily_guard_spent"
BACKUP_TOMTOM_UNAVAILABLE = "tomtom_unavailable"


@dataclass(frozen=True, slots=True)
class RoutedRoutes:
    """Routes from one provider only: TomTom and Valhalla are never mixed (architecture 6)."""

    provider: RoutingProviderName
    routes: tuple[ProviderRoute, ...]


def route_primary(env: TripEnvironment, request: TripRequest) -> RoutedRoutes:
    """One fastest call without alternatives; any outage or a spent daily budget uses the backup."""
    _note_trip_class(classify(request))
    with stage("routing"):
        routed = _primary_routes(env, request)
    current_notes().routing_provider = routed.provider.value
    return routed


def _primary_routes(env: TripEnvironment, request: TripRequest) -> RoutedRoutes:
    query = _query(env, request, RoutePreference.FASTEST, max_alternatives=0)
    if env.call_guard.try_acquire():
        try:
            return RoutedRoutes(env.routing.name, env.routing.routes(query))
        except RoutingUnavailable:
            current_notes().backup_reason = BACKUP_TOMTOM_UNAVAILABLE
    else:
        _backup_because_guard_is_spent()
    return RoutedRoutes(env.backup_routing.name, env.backup_routing.routes(query))


def route_compare(env: TripEnvironment, request: TripRequest) -> RoutedRoutes:
    """Fastest and eco run side by side; eco is awaited only if fastest lacks variety."""
    trip_class = classify(request)
    _note_trip_class(trip_class)
    with stage("routing"):
        routed = _compare_routes(env, request, trip_class)
    current_notes().routing_provider = routed.provider.value
    return routed


def _note_trip_class(trip_class: TripClass) -> None:
    notes = current_notes()
    notes.long_trip = trip_class.long_trip
    notes.straight_line_miles = trip_class.straight_line_miles


def _compare_routes(
    env: TripEnvironment, request: TripRequest, trip_class: TripClass
) -> RoutedRoutes:
    fastest = _query(env, request, RoutePreference.FASTEST, trip_class.alternatives)
    if not env.call_guard.try_acquire():
        _backup_because_guard_is_spent()
        return _from_backup(env.backup_routing, fastest)
    current_notes().alternatives_read_timeout_s = trip_class.alternatives_read_timeout_s
    fastest_call = _submit(env, lambda: _timed_alternatives(env, fastest, trip_class))
    eco_call = _submit_eco(env, fastest, trip_class)
    shapes = ShapeBook()
    try:
        distinct = drop_near_duplicates(fastest_call.result(), shapes)
    except RoutingUnavailable:
        if eco_call:
            eco_call.cancel()
        return _single_route_or_backup(env, fastest)
    if eco_call and len(distinct) < MAX_ROUTES_SHOWN:
        distinct = drop_near_duplicates((*distinct, *eco_call.result()), shapes)
    return RoutedRoutes(env.routing.name, choose_variety(distinct, MAX_ROUTES_SHOWN, shapes))


def _submit_eco(
    env: TripEnvironment, fastest: RouteQuery, trip_class: TripClass
) -> Future[tuple[ProviderRoute, ...]] | None:
    """Long trips skip the eco call: it would cost a thread, a budget unit and the same wait."""
    if not trip_class.asks_for_eco_routes:
        return None
    eco = replace(fastest, preference=RoutePreference.ECO)
    return _submit(env, lambda: _eco_routes(env, eco, trip_class))


def _timed_alternatives(
    env: TripEnvironment, query: RouteQuery, trip_class: TripClass
) -> tuple[ProviderRoute, ...]:
    started = time.monotonic()
    try:
        with one_attempt(trip_class.alternatives_read_timeout_s):
            return env.routing.routes(query)
    finally:
        current_notes().alternatives_ms = elapsed_ms(started)


def _single_route_or_backup(env: TripEnvironment, alternatives: RouteQuery) -> RoutedRoutes:
    """Long trips can time out with alternatives: ask TomTom once for one route, then the backup.

    One attempt at the client's own 8 s, so it fits in the trip deadline after the long wait.
    """
    if env.call_guard.try_acquire():
        try:
            with one_attempt():
                single = env.routing.routes(replace(alternatives, max_alternatives=0))
        except RoutingUnavailable:
            current_notes().backup_reason = BACKUP_TOMTOM_UNAVAILABLE
        else:
            current_notes().alternatives_unavailable = True
            return RoutedRoutes(env.routing.name, single)
    else:
        _backup_because_guard_is_spent()
    return _from_backup(env.backup_routing, alternatives)


def _submit[T](env: TripEnvironment, work: Callable[[], T]) -> Future[T]:
    """The worker thread keeps the request's context, so its log lines carry the request id."""
    return env.executor.submit(copy_context().run, work)


def _backup_because_guard_is_spent() -> None:
    current_notes().backup_reason = BACKUP_GUARD_SPENT
    log_guard_spent(fell_back_to="backup_routing")


def _eco_routes(
    env: TripEnvironment, query: RouteQuery, trip_class: TripClass
) -> tuple[ProviderRoute, ...]:
    """Extra routes are a bonus: if this call fails or is not allowed, fastest still answers."""
    if not env.call_guard.try_acquire():
        log_guard_spent(fell_back_to="fastest_routes_only")
        return ()
    try:
        with one_attempt(trip_class.alternatives_read_timeout_s):
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
