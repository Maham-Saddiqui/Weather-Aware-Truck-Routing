from dataclasses import dataclass, replace
from decimal import Decimal

from domain.distance import straight_line_miles
from domain.units import WHOLE_NUMBER, round_half_up
from services.trip_request import TripRequest

MAX_ROUTES_SHOWN = 3

# TomTom's compute time grows with route length and with options. On the live server about 920
# straight-line miles answered with alternatives in about 6 s; about 1,375 timed out at 8 s.
LONG_TRIP_STRAIGHT_LINE_MILES = Decimal(1000)

MILES_LOGGED_IN_STEPS_OF = 10


@dataclass(frozen=True, slots=True)
class TripClass:
    """How much routing work a trip gets: long trips ask for less work and may wait longer.

    A deadline of None means the trip runner's normal deadline.
    """

    long_trip: bool
    straight_line_miles: int
    alternatives: int
    alternatives_read_timeout_s: float
    asks_for_eco_routes: bool
    deadline_s: float | None


# Normal trips ask for the routes shown minus the main one and give TomTom a little more time.
NORMAL_TRIP = TripClass(
    long_trip=False,
    straight_line_miles=0,
    alternatives=MAX_ROUTES_SHOWN - 1,
    alternatives_read_timeout_s=12.0,
    asks_for_eco_routes=True,
    deadline_s=None,
)

# Long trips ask for less work and wait longer. TomTom cancels a request at about 30 s itself, so
# the wait plus the connect time stays under 25 s. The whole trip (routing, the 8 s single-route
# fallback, weather and rating) must fit in the deadline.
LONG_TRIP = TripClass(
    long_trip=True,
    straight_line_miles=0,
    alternatives=1,
    alternatives_read_timeout_s=22.0,
    asks_for_eco_routes=False,
    deadline_s=40.0,
)


def classify(request: TripRequest) -> TripClass:
    miles = straight_line_miles(request.origin, request.destination)
    nearest_ten = int(round_half_up(miles / MILES_LOGGED_IN_STEPS_OF, WHOLE_NUMBER))
    template = LONG_TRIP if miles >= LONG_TRIP_STRAIGHT_LINE_MILES else NORMAL_TRIP
    return replace(template, straight_line_miles=nearest_ten * MILES_LOGGED_IN_STEPS_OF)
