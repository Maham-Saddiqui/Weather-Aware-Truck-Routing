from datetime import timedelta

from domain.types import CheckpointSpacing

# A simple box around the lower 48 states, so a hand-made request cannot spend provider quota
# (SEC-03). It includes slivers of Canada and Mexico on purpose: simple beats exact here.
LOWER_48_MIN_LAT = 24.4
LOWER_48_MAX_LAT = 49.4
LOWER_48_MIN_LON = -125.0
LOWER_48_MAX_LON = -66.9

MAX_LOAD_LB = 80_000
MAX_DEPARTURE_AHEAD = timedelta(days=7)
SPACING_CHOICES_MILES = tuple(int(spacing) for spacing in CheckpointSpacing)
DEFAULT_SPACING_MILES = CheckpointSpacing.TWENTY_FIVE_MILES.value
MAX_LABEL_LENGTH = 200
