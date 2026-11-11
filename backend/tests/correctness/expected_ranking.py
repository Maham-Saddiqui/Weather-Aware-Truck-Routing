"""Hand-worked expectations for ranking, least-bad pick and recommendation sentence facts.

Part 3 of 3. Written from docs/domain/risk-rules.md only.
A route fact is (id, severe miles, high miles, average risk, travel seconds, distance miles).
Routes are listed in provider order. Comparison precision (RR-25): miles 0.1, average 0.01,
travel time whole minutes, all rounded half up; then shorter distance; then provider order.
"""

RouteFact = tuple[str, str, str, str, int, str]

# (derivation, eligible routes in provider order, expected ranked ids, deciding criterion)
RANKING_CASES: list[tuple[str, list[RouteFact], list[str], str]] = [
    (
        "RR-24 severe 10.04 -> 10.0 and 10.06 -> 10.1 differ, so A wins though B is first",
        [("B", "10.06", "0", "1", 3600, "50"), ("A", "10.04", "0", "1", 3600, "50")],
        ["A", "B"],
        "severe_miles",
    ),
    (
        "RR-25 severe 10.04 and 10.01 both 10.0 tie, High 5 vs 4 decides for B",
        [("A", "10.04", "5", "1", 3600, "50"), ("B", "10.01", "4", "1", 3600, "50")],
        ["B", "A"],
        "high_miles",
    ),
    (
        "RR-25 severe 10.05 and 10.14 tie at 10.1, High 5.04 and 5.01 tie, average 1.20 decides",
        [("A", "10.05", "5.04", "1.30", 3600, "50"), ("B", "10.14", "5.01", "1.20", 3600, "50")],
        ["B", "A"],
        "average_risk",
    ),
    (
        "RR-25 average 1.001 and 1.004 tie at 0.01, travel 62 vs 60 minutes decides for B",
        [("A", "1", "1", "1.001", 3700, "50"), ("B", "1", "1", "1.004", 3600, "50")],
        ["B", "A"],
        "travel_time",
    ),
    (
        "RR-25 3600 s and 3629 s are both 60 minutes, shorter distance decides for B",
        [("A", "1", "1", "1", 3600, "50.0"), ("B", "1", "1", "1", 3629, "49.9")],
        ["B", "A"],
        "distance",
    ),
    (
        "RR-25 distance 50.04 -> 50.0 and 50.06 -> 50.1 differ, shorter A wins",
        [("B", "1", "1", "1", 3600, "50.06"), ("A", "1", "1", "1", 3600, "50.04")],
        ["A", "B"],
        "distance",
    ),
    (
        "RR-25 everything ties, provider order keeps A first",
        [("A", "1", "1", "1", 3600, "50"), ("B", "1", "1", "1", 3600, "50")],
        ["A", "B"],
        "provider_order",
    ),
    (
        "RR-25 everything ties, provider order keeps B first when B is first",
        [("B", "1", "1", "1", 3600, "50"), ("A", "1", "1", "1", 3600, "50")],
        ["B", "A"],
        "provider_order",
    ),
    (
        "RR-25 severe 10.04 -> 10.0 and 10.05 -> 10.1 (half up) differ, A wins",
        [("B", "10.05", "0", "1", 3600, "50"), ("A", "10.04", "0", "1", 3600, "50")],
        ["A", "B"],
        "severe_miles",
    ),
    (
        "RR-25 average 1.004 -> 1.00 and 1.005 -> 1.01 (half up) differ, A wins",
        [("B", "1", "1", "1.005", 3600, "50"), ("A", "1", "1", "1.004", 3600, "50")],
        ["A", "B"],
        "average_risk",
    ),
    (
        "RR-25 3569 s = 59.48 -> 59 min and 3570 s = 59.5 -> 60 min (half up) differ, A wins",
        [("B", "1", "1", "1", 3570, "50"), ("A", "1", "1", "1", 3569, "50")],
        ["A", "B"],
        "travel_time",
    ),
    (
        "RR-24 criterion order: fewer Severe wins even with much more High",
        [("B", "1", "0", "1", 3600, "50"), ("A", "0", "90", "1", 3600, "50")],
        ["A", "B"],
        "severe_miles",
    ),
    (
        "RR-24 criterion order: lower average beats shorter time",
        [("B", "1", "1", "1.5", 3600, "50"), ("A", "1", "1", "1.0", 7200, "50")],
        ["A", "B"],
        "average_risk",
    ),
    (
        "RR-24 three routes ordered by Severe miles 3, 1, 2",
        [
            ("A", "3", "0", "1", 3600, "50"),
            ("B", "1", "0", "1", 3600, "50"),
            ("C", "2", "0", "1", 3600, "50"),
        ],
        ["B", "C", "A"],
        "severe_miles",
    ),
    (
        "RR-24 High miles decide when Severe is zero for both",
        [("A", "0", "20", "1", 3600, "50"), ("B", "0", "10", "1", 3600, "50")],
        ["B", "A"],
        "high_miles",
    ),
]

# A route with ineligible status next to an eligible one. (id, severe, high, avg, seconds, distance)
# The eligible route is the only candidate: rank 1, deciding criterion only_eligible.
ONLY_ELIGIBLE_CASE: tuple[str, list[RouteFact], RouteFact] = (
    "RR-22/RR-24 an ineligible route is never ranked, even if its numbers look better",
    [("B", "50", "50", "2", 3600, "50")],
    ("A", "0", "0", "0", 3000, "40"),
)

# (id, no travel miles, no data miles, severe, high, avg, seconds, distance): none eligible. RR-23.
LeastBadFact = tuple[str, str, str, str, str, str, int, str]

# (derivation, routes in provider order, expected display order, least bad id)
# Each route is consistent with RR-22: gaps above 10 percent or a No Travel mile.
LEAST_BAD_CASES: list[tuple[str, list[LeastBadFact], list[str], str]] = [
    (
        "RR-23 worked example: A 0+60 = 60 versus B 2+0 = 2, B is least bad",
        [("A", "0", "60", "0", "0", "0", 3600, "100"), ("B", "2", "0", "0", "0", "0", 3600, "100")],
        ["B", "A"],
        "B",
    ),
    (
        "RR-23 unknown miles count as bad: A 0+11 = 11 versus B 8+0 = 8, B is least bad",
        [("A", "0", "11", "0", "0", "0", 3600, "100"), ("B", "8", "0", "0", "0", "0", 3600, "100")],
        ["B", "A"],
        "B",
    ),
    (
        "RR-23 tie on 5 and 5 (40 miles), then RR-24: Severe 1 beats 3",
        [("A", "5", "0", "3", "0", "0", 3600, "40"), ("B", "0", "5", "1", "0", "0", 3600, "40")],
        ["B", "A"],
        "B",
    ),
    (
        "RR-23 0.9 versus 1.0: B is least bad even with more Severe",
        [
            ("A", "1", "0", "0", "0", "0", 3600, "100"),
            ("B", "0.5", "0.4", "9", "0", "0", 3600, "100"),
        ],
        ["B", "A"],
        "B",
    ),
    (
        "RR-23 three routes sorted least bad first: sums 10, 2, 5",
        [
            ("A", "10", "0", "0", "0", "0", 3600, "100"),
            ("B", "2", "0", "0", "0", "0", 3600, "100"),
            ("C", "0", "5", "0", "0", "0", 3600, "30"),
        ],
        ["B", "C", "A"],
        "B",
    ),
]

# Sentence facts (RR-26): (derivation, deciding criterion, any-of words).
# Words are matched case-insensitively; the sentence need only contain one of each group.
SENTENCE_CASES: list[tuple[str, str, list[str]]] = [
    ("RR-26 names Severe miles", "severe_miles", ["severe"]),
    ("RR-26 names High miles", "high_miles", ["high"]),
    ("RR-26 names average risk", "average_risk", ["average"]),
    ("RR-26 names travel time", "travel_time", ["time", "faster", "quicker", "fastest"]),
    ("RR-26 names distance", "distance", ["distance", "shorter", "shortest"]),
    ("RR-26 the only eligible route", "only_eligible", ["only"]),
]

# RR-26 / RR-23 sentence with no-data miles: eligible winner whose rating covers 95 of 100 miles.
NO_DATA_SENTENCE_FACTS = (
    "5",
    "95",
)  # the sentence should state the 95 rated miles (and/or the 5 unrated)
NONE_ELIGIBLE_WORDS = ["later"]  # RR-23 suggests leaving later
