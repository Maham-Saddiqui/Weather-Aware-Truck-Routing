import json
from collections.abc import Callable
from typing import Any

from django.http.response import HttpResponseBase
from django.test import Client

from config.container import Providers
from domain.types import GeoPoint
from providers.timezone.offline import OfflineTimeZoneLookup, TimeZoneNotFound
from tests.fakes.bundle import default_fakes, with_trips
from tests.fakes.trips import route_bent, tomtom_answering, trip_body

type UseFakes = Callable[[Providers], Providers]


def post(client: Client, path: str) -> tuple[HttpResponseBase, dict[str, Any]]:
    response = client.post(f"/api/v1{path}", trip_body(), content_type="application/json")
    body: dict[str, Any] = json.loads(b"".join(response))
    return response, body


def one_route(use_fakes: UseFakes) -> None:
    use_fakes(with_trips(default_fakes(), routing=tomtom_answering((route_bent(0.0),))))


def test_the_primary_response_shows_the_servers_rounded_strings_and_no_rank(
    client: Client, use_fakes: UseFakes
) -> None:
    """RR-02, RR-19, RR-21"""
    one_route(use_fakes)

    response, body = post(client, "/trips/primary")

    route = body["route"]
    first, second, last = route["checkpoints"][0], route["checkpoints"][1], route["checkpoints"][-1]
    assert response["Cache-Control"] == "no-store"
    assert route["rank"] is None
    assert route["summary"]["distance_miles"] == "100.0"
    assert route["summary"]["miles_by_level"]["low"] == "100.0"
    assert route["summary"]["average_risk"] == "0.00"
    assert (first["distance_miles"], first["covered_miles"]) == ("0.0", "12.5")
    assert (second["distance_miles"], second["covered_miles"]) == ("25.0", "25.0")
    assert last["distance_miles"] == "100.0"
    assert first["measurements"] == {
        "wind_mph": "5",
        "rain_in_hr": "0.00",
        "snow_in_hr": "0.00",
        "gust_mph": "10",
    }
    assert (first["level"], first["driving_factors"], first["load_rule"]) == ("low", [], "none")


def test_arrival_times_are_exact_utc_instants_with_the_zone_name_beside_them(
    client: Client, use_fakes: UseFakes
) -> None:
    """RR-18"""
    one_route(use_fakes)

    _, body = post(client, "/trips/primary")

    checkpoints = body["route"]["checkpoints"]
    assert checkpoints[0]["eta_utc"] == "2026-11-11T17:25:00Z"
    assert checkpoints[1]["eta_utc"].startswith("2026-11-11T17:50:00")
    assert checkpoints[0]["time_zone"] == "America/Chicago"
    assert body["heatmap"]["start_utc"] == "2026-11-11T17:25:00Z"


def test_the_compare_response_names_the_deciding_criterion_and_the_provider(
    client: Client, use_fakes: UseFakes
) -> None:
    """RR-26"""
    routing = tomtom_answering((route_bent(0.0), route_bent(0.6)))
    use_fakes(with_trips(default_fakes(), routing=routing))

    response, body = post(client, "/trips/compare")

    assert response["Cache-Control"] == "no-store"
    assert body["routing_provider"] == "tomtom"
    assert body["recommendation"]["status"] == "recommended"
    assert body["recommendation"]["route_id"] == body["routes"][0]["id"]
    assert body["recommendation"]["sentence"]


def test_a_place_no_time_zone_covers_is_a_validation_problem_not_a_crash(
    client: Client, use_fakes: UseFakes
) -> None:
    class NowhereToBeFound:
        def zone_name(self, point: GeoPoint) -> str:
            raise TimeZoneNotFound("none")

    use_fakes(with_trips(default_fakes(), timezone=NowhereToBeFound()))

    response = client.get("/api/v1/timezone", {"lat": "30", "lon": "-40"})

    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"
    assert "lat" in response.json()["field_errors"]


def test_a_checkpoint_no_time_zone_covers_is_a_plain_422_problem_not_a_500(
    client: Client, use_fakes: UseFakes
) -> None:
    class NowhereToBeFound:
        def zone_name(self, point: GeoPoint) -> str:
            raise TimeZoneNotFound("secret lookup detail")

    routing = tomtom_answering((route_bent(0.0),))
    use_fakes(with_trips(default_fakes(), routing=routing, timezone=NowhereToBeFound()))

    response, body = post(client, "/trips/primary")

    assert response.status_code == 422
    assert body["code"] == "validation_error"
    assert "secret lookup detail" not in json.dumps(body)


def test_the_real_offline_lookup_names_the_zone_of_a_chicago_address() -> None:
    """RR-18"""
    assert OfflineTimeZoneLookup().zone_name(GeoPoint(41.8781, -87.6298)) == "America/Chicago"
