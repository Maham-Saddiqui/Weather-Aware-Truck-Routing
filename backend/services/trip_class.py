from dataclasses import dataclass, replace
from decimal import Decimal

from domain.distance import straight_line_miles
from domain.units import WHOLE_NUMBER, round_half_up
from providers.trip_notes import AlternativesTier
from services.trip_request import TripRequest

MAX_ROUTES_SHOWN = 3
ALTERNATIVES_ASKED = MAX_ROUTES_SHOWN - 1

# TomTom's compute time grows with route length and with options. On the live server about 920
# straight-line miles answered with alternatives in about 6 s; about 1,375 timed out at 8 s.
LONG_TRIP_STRAIGHT_LINE_MILES = Decimal(1000)

MILES_LOGGED_IN_STEPS_OF = 10

NORMAL_ALTERNATIVES_READ_TIMEOUT_S = 12.0
LONG_ALTERNATIVES_READ_TIMEOUT_S = 22.0
ONE_ALTERNATIVE_READ_TIMEOUT_S = 8.0
SINGLE_ROUTE_READ_TIMEOUT_S = 6.0
LONG_TRIP_DEADLINE_S = 40.0
WEATHER_AND_RATING_RESERVE_S = 4.0


@dataclass(frozen=True, slots=True)
class FallbackTier:
    """A smaller TomTom question, asked once when the bigger one timed out.

    A read timeout of None is the client's own (8 s).
    """

    tier: AlternativesTier
    alternatives: int
    read_timeout_s: float | None


@dataclass(frozen=True, slots=True)
class TripClass:
    """How much routing work a trip gets: long trips wait longer and step down in tiers.

    A deadline of None means the trip runner's normal deadline. The eco call is a bonus beside
    the fastest call; on long trips it asks for no alternatives and waits the client's normal
    time (read timeout None), so it finishes long before the fastest call gives up.
    """

    long_trip: bool
    straight_line_miles: int
    alternatives: int
    alternatives_read_timeout_s: float
    eco_alternatives: int
    eco_read_timeout_s: float | None
    fallback_tiers: tuple[FallbackTier, ...]
    deadline_s: float | None


# Normal trips ask for the routes shown minus the main one and give TomTom a little more time.
NORMAL_TRIP = TripClass(
    long_trip=False,
    straight_line_miles=0,
    alternatives=ALTERNATIVES_ASKED,
    alternatives_read_timeout_s=NORMAL_ALTERNATIVES_READ_TIMEOUT_S,
    eco_alternatives=ALTERNATIVES_ASKED,
    eco_read_timeout_s=NORMAL_ALTERNATIVES_READ_TIMEOUT_S,
    fallback_tiers=(FallbackTier(AlternativesTier.NONE, 0, None),),
    deadline_s=None,
)

# Long trips ask for the same alternatives and wait longer. TomTom cancels a request at about 30 s
# itself, so the wait plus the connect time stays under 25 s. If two alternatives time out, one
# alternative (the shape verified live) is asked once, then a single route. All the waits plus
# the reserve for weather and rating must fit in the deadline.
LONG_TRIP = TripClass(
    long_trip=True,
    straight_line_miles=0,
    alternatives=ALTERNATIVES_ASKED,
    alternatives_read_timeout_s=LONG_ALTERNATIVES_READ_TIMEOUT_S,
    eco_alternatives=0,
    eco_read_timeout_s=None,
    fallback_tiers=(
        FallbackTier(AlternativesTier.ONE, 1, ONE_ALTERNATIVE_READ_TIMEOUT_S),
        FallbackTier(AlternativesTier.NONE, 0, SINGLE_ROUTE_READ_TIMEOUT_S),
    ),
    deadline_s=LONG_TRIP_DEADLINE_S,
)


def classify(request: TripRequest) -> TripClass:
    miles = straight_line_miles(request.origin, request.destination)
    nearest_ten = int(round_half_up(miles / MILES_LOGGED_IN_STEPS_OF, WHOLE_NUMBER))
    template = LONG_TRIP if miles >= LONG_TRIP_STRAIGHT_LINE_MILES else NORMAL_TRIP
    return replace(template, straight_line_miles=nearest_ten * MILES_LOGGED_IN_STEPS_OF)
