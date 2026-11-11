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

# (length metres, spacing, checkpoint metres, covered metres): whole-metre routes, RR-30.
WHOLE_METRE_CASES: list[tuple[str, int, list[str], list[str]]] = [
    (
        "100000",
        25,
        ["0", "40233.6", "80467.2", "100000"],
        ["20116.8", "40233.6", "29883.2", "9766.4"],
    ),
    (
        "100000",
        10,
        ["0", "16093.44", "32186.88", "48280.32", "64373.76", "80467.2", "96560.64", "100000"],
        [
            "8046.72",
            "16093.44",
            "16093.44",
            "16093.44",
            "16093.44",
            "16093.44",
            "9766.4",
            "1719.68",
        ],
    ),
    ("30000", 50, ["0", "30000"], ["15000", "15000"]),
]

HEATMAP_HOURS = 49
SERIES_LENGTH = 51  # hourly values at 12:00 UTC + k hours, k = 0..50
BASE_HOUR_ISO = "2026-11-12T12:00:00+00:00"
CALM_WIND = "10"

# Hourly overrides by k (hour index from 12:00): wind, rain.
HEAT_WIND_OVERRIDES: dict[int, str | None] = {
    3: "30",
    7: None,
    10: "40",
    20: "50",
    30: "60",
    40: None,
}
HEAT_RAIN_OVERRIDES: dict[int, str | None] = {6: "0.3", 8: "1.5", 15: "0.6", 45: None}

# Whole-metre routes just either side of a 25-mile checkpoint (RR-13, RR-19, RR-30).
EDGE_METRE_CASES: list[tuple[str, int, list[str], list[str]]] = [
    ("40234", 25, ["0", "40233.6", "40234"], ["20116.8", "20117", "0.2"]),
    ("40233", 25, ["0", "40233"], ["20116.5", "20116.5"]),
]

# (length m, travel seconds, provider table of (distance m, elapsed s), spacing,
#  [(checkpoint m, elapsed seconds)]). RR-14, RR-15: linear between the provider's readings.
ETA_CASES: list[tuple[int, int, list[tuple[int, int]], int, list[tuple[str, str]]]] = [
    (
        100000,
        5000,
        [],
        25,
        [("0", "0"), ("40233.6", "2011.68"), ("80467.2", "4023.36"), ("100000", "5000")],
    ),
    (
        100000,
        5000,
        [(50000, 1000)],
        25,
        [("0", "0"), ("40233.6", "804.672"), ("80467.2", "3437.376"), ("100000", "5000")],
    ),
    (
        60000,
        3600,
        [(10000, 1200), (40000, 1800)],
        25,
        [("0", "0"), ("40233.6", "1821.024"), ("60000", "3600")],
    ),
]

# Departure -> {slider hour: expected character}. Every other slider hour is "0".
# Derivations (load 10,000):
# dep 12:00 or 12:20: wind at k=h, rain at k=h+1.
#   h3 wind 30 "1"; h5 rain[6] 0.3 "2"; h7 wind missing but rain[8] 1.5 "4"; h10 wind 40 "2";
#   h14 rain[15] 0.6 "3"; h20 wind 50 "3"; h30 wind 60 "4";
#   h40 wind missing "x"; h44 rain[45] missing "x".
# dep 12:40: wind and rain both at k=h+1, so the wind entries shift one hour earlier;
#   h6 wind[7] missing and rain[7] 0 gives "x".
HEAT_CASES: dict[str, dict[int, str]] = {
    "2026-11-12T12:00:00+00:00": {
        3: "1",
        5: "2",
        7: "4",
        10: "2",
        14: "3",
        20: "3",
        30: "4",
        40: "x",
        44: "x",
    },
    "2026-11-12T12:20:00+00:00": {
        3: "1",
        5: "2",
        7: "4",
        10: "2",
        14: "3",
        20: "3",
        30: "4",
        40: "x",
        44: "x",
    },
    "2026-11-12T12:40:00+00:00": {
        2: "1",
        5: "2",
        6: "x",
        7: "4",
        9: "2",
        14: "3",
        19: "3",
        29: "4",
        39: "x",
        44: "x",
    },
}

# Load 45,000, departure 12:00: RR-08 wind 40 is Severe at h10; RR-07 wind 50 is No Travel at h20.
HEAT_HEAVY_LOAD_CHANGES: dict[int, str] = {10: "3", 20: "4"}
HEAT_HEAVY_LOAD_LB = 45000
