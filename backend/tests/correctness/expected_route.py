"""Hand-worked expectations for checkpoints, covered miles, route summaries and the heatmap.

Part 2 of 3. Written from docs/domain/risk-rules.md only. Distances are exact decimal strings.
"""

METRES_PER_MILE = "1609.344"

# (spacing in miles, spacing in metres) RR-30
SPACING_METRES: list[tuple[int, str]] = [(10, "16093.44"), (25, "40233.6"), (50, "80467.2")]

# (length miles, spacing, checkpoint miles, covered miles). RR-13, RR-19.
PLACEMENT_CASES: list[tuple[str, int, list[str], list[str]]] = [
    ("8", 10, ["0", "8"], ["4", "4"]),
    ("8", 25, ["0", "8"], ["4", "4"]),
    ("8", 50, ["0", "8"], ["4", "4"]),
    ("10", 10, ["0", "10"], ["5", "5"]),
    ("25", 10, ["0", "10", "20", "25"], ["5", "10", "7.5", "2.5"]),
    ("25", 25, ["0", "25"], ["12.5", "12.5"]),
    ("25", 50, ["0", "25"], ["12.5", "12.5"]),
    ("50", 25, ["0", "25", "50"], ["12.5", "25", "12.5"]),
    ("50", 50, ["0", "50"], ["25", "25"]),
    ("60", 10, ["0", "10", "20", "30", "40", "50", "60"], ["5", "10", "10", "10", "10", "10", "5"]),
    ("60", 25, ["0", "25", "50", "60"], ["12.5", "25", "17.5", "5"]),
    ("60", 50, ["0", "50", "60"], ["25", "30", "5"]),
    (
        "100",
        10,
        ["0", "10", "20", "30", "40", "50", "60", "70", "80", "90", "100"],
        ["5", "10", "10", "10", "10", "10", "10", "10", "10", "10", "5"],
    ),
    ("100", 25, ["0", "25", "50", "75", "100"], ["12.5", "25", "25", "25", "12.5"]),
    ("100", 50, ["0", "50", "100"], ["25", "50", "25"]),
    (
        "99",
        10,
        ["0", "10", "20", "30", "40", "50", "60", "70", "80", "90", "99"],
        ["5", "10", "10", "10", "10", "10", "10", "10", "10", "9.5", "4.5"],
    ),
    ("99", 25, ["0", "25", "50", "75", "99"], ["12.5", "25", "25", "24.5", "12"]),
    ("99", 50, ["0", "50", "99"], ["25", "49.5", "24.5"]),
]

# (length metres, spacing, checkpoint metres, covered metres): whole-metre provider distances, RR-30.
WHOLE_METRE_CASES: list[tuple[str, int, list[str], list[str]]] = [
    ("100000", 25, ["0", "40233.6", "80467.2", "100000"], ["20116.8", "40233.6", "29883.2", "9766.4"]),
    (
        "100000",
        10,
        ["0", "16093.44", "32186.88", "48280.32", "64373.76", "80467.2", "96560.64", "100000"],
        ["8046.72", "16093.44", "16093.44", "16093.44", "16093.44", "16093.44", "9766.4", "1719.68"],
    ),
    ("30000", 50, ["0", "30000"], ["15000", "15000"]),
]

# (name, length miles, spacing, checkpoint levels, miles by level, average risk, worst, eligible, reason)
# Levels and miles by level use contract names; missing levels mean zero miles.
SUMMARY_CASES: list[
    tuple[str, str, int, list[str], dict[str, str], str | None, str | None, bool, str | None]
] = [
    (
        "RR-21 four levels: (0*12.5+1*25+2*17.5+3*5)/60 = 75/60",
        "60", 25, ["low", "moderate", "high", "severe"],
        {"low": "12.5", "moderate": "25", "high": "17.5", "severe": "5"},
        "1.25", "severe", True, None,
    ),
    (
        "RR-22 gap of 25 of 60 miles is far above 10 percent",
        "60", 25, ["low", "no_data", "low", "low"],
        {"low": "35", "no_data": "25"},
        "0.00", "low", False, "not_enough_weather_data",
    ),
    (
        "RR-21 no mile has data, so the average is a dash",
        "60", 25, ["no_data", "no_data", "no_data", "no_data"],
        {"no_data": "60"},
        None, None, False, "not_enough_weather_data",
    ),
    (
        "RR-21 two checkpoints: (0*4+2*4)/8 = 1",
        "8", 10, ["low", "high"],
        {"low": "4", "high": "4"},
        "1.00", "high", True, None,
    ),
    (
        "RR-22 100 miles with exactly 10 no-data miles stays eligible (10*10 <= 100)",
        "100", 10, ["low"] * 5 + ["no_data"] + ["low"] * 5,
        {"low": "90", "no_data": "10"},
        "0.00", "low", True, None,
    ),
    (
        "RR-22 99 miles with 10 no-data miles is 10.1 percent, ineligible (10*10 > 99)",
        "99", 10, ["low"] * 5 + ["no_data"] + ["low"] * 5,
        {"low": "89", "no_data": "10"},
        "0.00", "low", False, "not_enough_weather_data",
    ),
    (
        "RR-22 99 miles, checkpoint at 90 missing covers 9.5 miles, 95 <= 99 eligible",
        "99", 10, ["low"] * 9 + ["no_data", "low"],
        {"low": "89.5", "no_data": "9.5"},
        "0.00", "low", True, None,
    ),
    (
        "RR-22 99 miles, destination missing covers 4.5 miles, eligible",
        "99", 10, ["low"] * 10 + ["no_data"],
        {"low": "94.5", "no_data": "4.5"},
        "0.00", "low", True, None,
    ),
    (
        "RR-22 100 miles, origin and destination missing cover 5+5=10, exactly 10 percent eligible",
        "100", 10, ["no_data"] + ["low"] * 9 + ["no_data"],
        {"low": "90", "no_data": "10"},
        "0.00", "low", True, None,
    ),
    (
        "RR-22 100 miles, origin and next missing cover 5+10=15, ineligible",
        "100", 10, ["no_data", "no_data"] + ["low"] * 9,
        {"low": "85", "no_data": "15"},
        "0.00", "low", False, "not_enough_weather_data",
    ),
    (
        "RR-22 any No Travel checkpoint makes the route ineligible; average 100/60 = 1.67 half up",
        "60", 25, ["low", "no_travel", "low", "low"],
        {"low": "35", "no_travel": "25"},
        "1.67", "no_travel", False, "no_travel",
    ),
    (
        "RR-21 average uses only miles with data: 55/90 = 0.61",
        "100", 10, ["moderate", "high", "severe", "low", "low", "no_data"] + ["low"] * 5,
        {"moderate": "5", "high": "10", "severe": "10", "low": "65", "no_data": "10"},
        "0.61", "severe", True, None,
    ),
    (
        "RR-21 average 12.5/100 = 0.125 rounds half up to 0.13",
        "100", 25, ["moderate"] + ["low"] * 4,
        {"moderate": "12.5", "low": "87.5"},
        "0.13", "moderate", True, None,
    ),
    (
        "RR-21 average 62.5/100 = 0.625 rounds half up to 0.63",
        "100", 25, ["moderate"] * 3 + ["low"] * 2,
        {"moderate": "62.5", "low": "37.5"},
        "0.63", "moderate", True, None,
    ),
    (
        "RR-21 all Low gives average 0",
        "50", 25, ["low", "low", "low"],
        {"low": "50"},
        "0.00", "low", True, None,
    ),
    (
        "RR-22 all No Travel: average 4, ineligible",
        "8", 10, ["no_travel", "no_travel"],
        {"no_travel": "8"},
        "4.00", "no_travel", False, "no_travel",
    ),
    (
        "RR-21 High plus no data: average 2 over the rated 12.5 miles; gap 50 percent ineligible",
        "25", 25, ["high", "no_data"],
        {"high": "12.5", "no_data": "12.5"},
        "2.00", "high", False, "not_enough_weather_data",
    ),
]

HEATMAP_HOURS = 49
SERIES_LENGTH = 51  # hourly values at 12:00 UTC + k hours, k = 0..50
BASE_HOUR_ISO = "2026-11-12T12:00:00+00:00"
CALM_WIND = "10"

# Hourly overrides by k (hour index from 12:00): wind, rain.
HEAT_WIND_OVERRIDES: dict[int, str | None] = {3: "30", 7: None, 10: "40", 20: "50", 30: "60", 40: None}
HEAT_RAIN_OVERRIDES: dict[int, str | None] = {6: "0.3", 8: "1.5", 15: "0.6", 45: None}

# Departure -> {slider hour: expected character}. Every other slider hour is "0".
# Derivations (load 10,000):
# dep 12:00 or 12:20: wind at k=h, rain at k=h+1 -> h3 wind 30 "1"; h5 rain[6] 0.3 "2"; h7 wind missing but rain[8] 1.5 "4";
#   h10 wind 40 "2"; h14 rain[15] 0.6 "3"; h20 wind 50 "3"; h30 wind 60 "4"; h40 wind missing "x"; h44 rain[45] missing "x".
# dep 12:40: wind and rain both at k=h+1 -> everything above that came from wind shifts one hour earlier; h6 wind[7] missing "x".
HEAT_CASES: dict[str, dict[int, str]] = {
    "2026-11-12T12:00:00+00:00": {3: "1", 5: "2", 7: "4", 10: "2", 14: "3", 20: "3", 30: "4", 40: "x", 44: "x"},
    "2026-11-12T12:20:00+00:00": {3: "1", 5: "2", 7: "4", 10: "2", 14: "3", 20: "3", 30: "4", 40: "x", 44: "x"},
    "2026-11-12T12:40:00+00:00": {2: "1", 5: "2", 6: "x", 7: "4", 9: "2", 14: "3", 19: "3", 29: "4", 39: "x", 44: "x"},
}

# Load 45,000 on departure 12:00: RR-08 wind 40 becomes Severe at h10; RR-07 wind 50 becomes No Travel at h20.
HEAT_HEAVY_LOAD_CHANGES: dict[int, str] = {10: "3", 20: "4"}
HEAT_HEAVY_LOAD_LB = 45000
