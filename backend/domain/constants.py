from decimal import Decimal

METRES_PER_MILE = Decimal("1609.344")
KILOGRAMS_PER_POUND = Decimal("0.45359237")
EMPTY_TRUCK_WEIGHT_LB = 35_000

FIRST_ROUTE_NAME = "Route 1"

WIND_DECIMALS = Decimal("1")
PRECIPITATION_DECIMALS = Decimal("0.01")
COMPARISON_MILES_DECIMALS = Decimal("0.1")
COMPARISON_RISK_DECIMALS = Decimal("0.01")

WIND_LOAD_LIMIT_FOR_NO_TRAVEL_LB = 30_000
WIND_LOAD_LIMIT_FOR_SEVERE_LB = 40_000

# RR-22: a route may have at most 1 part in this many of its distance without weather data.
NO_DATA_SHARE_LIMIT_DENOMINATOR = 10

HEATMAP_HOURS = 49

# 0.05 degree cells; weather points are snapped to them before fetching (architecture section 7).
WEATHER_CELLS_PER_DEGREE = 20

# 0.01 degree cells (about 1 km) used to compare route shapes (architecture section 6).
OVERLAP_CELLS_PER_DEGREE = 100
# A route's cells are sampled this many times per cell along each segment, so no cell is skipped.
OVERLAP_SAMPLES_PER_CELL = 3
NEAR_DUPLICATE_OVERLAP_PERCENT = 90
