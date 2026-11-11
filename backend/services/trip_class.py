from dataclasses import dataclass, replace
from decimal import Decimal

from domain.distance import straight_line_miles
from domain.units import WHOLE_NUMBER, round_half_up
from services.trip_request import TripRequest

MAX_ROUTES_SHOWN = 3
ALTERNATIVES_ASKED = MAX_ROUTES_SHOWN - 1

# TomTom's compute time grows with route length and with options. On the live server about 920
# straight-line miles answered with alternatives in about 6 s; about 1,375 timed out at 8 s.
LONG_TRIP_STRAIGHT_LINE_MILES = Decimal(1000)

MILES_LOGGED_IN_STEPS_OF = 10


@dataclass(frozen=True, slots=True)
class TripClass:
    """How much routing work a trip gets: long trips ask for less work and may wait longer.

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
    deadline_s: float | None


# Normal trips ask for the routes shown minus the main one and give TomTom a little more time.
NORMAL_TRIP = TripClass(
    long_trip=False,
    straight_line_miles=0,
    alternatives=ALTERNATIVES_ASKED,
    alternatives_read_timeout_s=12.0,
    eco_alternatives=ALTERNATIVES_ASKED,
    eco_read_timeout_s=12.0,
    deadline_s=None,
)

# Long trips ask for the same alternatives and wait longer. TomTom cancels a request at about 30 s
# itself, so the wait plus the connect time stays under 25 s. The whole trip (routing, the
# fallbacks, weather and rating) must fit in the deadline.
LONG_TRIP = TripClass(
    long_trip=True,
    straight_line_miles=0,
    alternatives=ALTERNATIVES_ASKED,
    alternatives_read_timeout_s=22.0,
    eco_alternatives=0,
    eco_read_timeout_s=None,
    deadline_s=40.0,
)


def classify(request: TripRequest) -> TripClass:
    miles = straight_line_miles(request.origin, request.destination)
    nearest_ten = int(round_half_up(miles / MILES_LOGGED_IN_STEPS_OF, WHOLE_NUMBER))
    template = LONG_TRIP if miles >= LONG_TRIP_STRAIGHT_LINE_MILES else NORMAL_TRIP
    return replace(template, straight_line_miles=nearest_ten * MILES_LOGGED_IN_STEPS_OF)
