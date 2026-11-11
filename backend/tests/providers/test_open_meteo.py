import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import httpx

from domain.types import GeoPoint
from providers.trip_notes import recording_trip
from tests.fakes.open_meteo import NOW, OTHER_POINT, POINT, Service, answer, location


def test_rain_and_showers_are_added_in_exact_decimals_and_nothing_becomes_a_float() -> None:
    """RR-02"""
    weather = Service().weather.forecast([POINT])[POINT]

    assert weather.rain_in[0] == Decimal("0.3")
    assert tuple(weather.wind_mph) == (Decimal("10.5"), Decimal("11.5"), Decimal("12.5"))
    assert weather.gust_mph[0] == Decimal("20.5")
    assert weather.snow_in[1] == Decimal("0.01")
    assert weather.first_hour_utc == datetime(2026, 11, 11, 14, 0, tzinfo=UTC)


def test_one_batched_request_asks_for_every_point_with_units_and_the_window() -> None:
    service = Service(lambda request: answer(location(), location()))

    result = service.weather.forecast([POINT, OTHER_POINT])

    (request,) = service.requests
    assert set(result) == {POINT, OTHER_POINT}
    params = request.url.params
    assert params["latitude"] == "41.0,42.0"
    assert params["longitude"] == "-87.0,-88.0"
    assert params["hourly"] == "wind_speed_10m,wind_gusts_10m,rain,showers,snowfall"
    assert params["wind_speed_unit"] == "mph"
    assert params["precipitation_unit"] == "inch"
    assert params["start_hour"] == "2026-11-11T14:00"
    assert params["end_hour"] == "2026-11-21T13:00"
    assert params["timeformat"] == "unixtime"


def test_a_reading_with_a_missing_part_stays_missing_instead_of_being_guessed() -> None:
    """RR-11"""
    service = Service(lambda request: answer(location(showers="[null, 0.0, 0.0]")))

    weather = service.weather.forecast([POINT])[POINT]

    assert tuple(weather.rain_in) == (None, Decimal("0.0"), Decimal("0.0"))


def test_a_point_without_data_is_absent_from_the_result() -> None:
    service = Service(lambda request: answer(location(), location(time="[]")))

    result = service.weather.forecast([POINT, OTHER_POINT])

    assert set(result) == {POINT}


def test_points_inside_one_weather_cell_share_one_requested_location() -> None:
    """The cell is the 0.05 degree grid of architecture section 7, defined once in the domain."""
    service = Service()
    near = GeoPoint(41.02, -87.02)

    result = service.weather.forecast([POINT, near])

    assert service.requests[0].url.params["latitude"] == "41.0"
    assert set(result) == {POINT, near}


def test_points_in_neighbouring_weather_cells_are_requested_separately() -> None:
    service = Service()

    service.weather.forecast([POINT, GeoPoint(41.05, -87.0)])

    assert service.requests[0].url.params["latitude"] == "41.0,41.05"


def test_cells_already_cached_cost_no_provider_call_and_only_new_cells_are_fetched() -> None:
    service = Service()
    service.weather.forecast([POINT])

    service.weather.forecast([POINT])
    assert len(service.requests) == 1

    service.weather.forecast([POINT, OTHER_POINT])
    assert len(service.requests) == 2
    assert service.requests[1].url.params["latitude"] == "42.0"


def test_a_cached_window_is_fetched_again_after_an_hour() -> None:
    service = Service()
    service.weather.forecast([POINT])

    service.clock[0] = NOW + timedelta(hours=1)
    service.weather.forecast([POINT])

    assert len(service.requests) == 2


def test_identical_concurrent_requests_share_one_provider_call() -> None:
    service = Service()
    start = threading.Barrier(4)

    def ask() -> int:
        start.wait()
        return len(service.weather.forecast([POINT, OTHER_POINT]))

    with ThreadPoolExecutor(4) as pool:
        sizes = [future.result() for future in [pool.submit(ask) for _ in range(4)]]

    assert sizes == [2, 2, 2, 2]
    assert len(service.requests) == 1


def test_an_answer_without_any_hourly_data_leaves_the_point_absent() -> None:
    service = Service(lambda request: httpx.Response(200, text="{}"))

    assert service.weather.forecast([POINT]) == {}


def test_the_trip_notes_count_the_cells_the_cache_already_held() -> None:
    service = Service()
    service.weather.forecast([POINT])

    with recording_trip() as notes:
        service.weather.forecast([POINT, OTHER_POINT])

    assert notes.weather_cache_hits == 1
