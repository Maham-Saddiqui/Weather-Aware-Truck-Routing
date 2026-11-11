from datetime import timedelta

from domain.types import CheckpointSpacing

# A simple box around the lower 48 states, so a hand-made request cannot spend provider quota
# (SEC-03). It includes slivers of Canada and Mexico on purpose: simple beats exact here.
LOWER_48_MIN_LAT = 24.4
LOWER_48_MAX_LAT = 49.4
LOWER_48_MIN_LON = -125.0
LOWER_48_MAX_LON = -66.9

# Throttle scopes: rates per scope live in the settings (SEC-05).
TRIP_THROTTLE_SCOPE = "trips"
ATTRIBUTION_THROTTLE_SCOPE = "attribution"

MAX_LOAD_LB = 80_000
MAX_DEPARTURE_AHEAD = timedelta(days=7)
SPACING_CHOICES_MILES = tuple(int(spacing) for spacing in CheckpointSpacing)
DEFAULT_SPACING_MILES = CheckpointSpacing.TWENTY_FIVE_MILES.value
MAX_LABEL_LENGTH = 200

# A valid trip request is under 1 KB; the rest is room for long place names.
MAX_BODY_BYTES = 8 * 1024
