import pytest

from domain.types import GeoPoint
from providers.weather.open_meteo import POINTS_PER_REQUEST, WEATHER_TOTAL_TIMEOUT_S
from providers.weather.port import WeatherUnavailable
from tests.fakes.open_meteo import (
    POINT,
    FakeStopwatch,
    Service,
    SlowFetch,
    answer,
    location,
    two_chunks_of_points,
)


def test_a_fully_cached_request_does_not_wait_behind_a_slow_fetch() -> None:
    """PERF-04"""
    slow = SlowFetch()
    slow.begin()

    result = slow.service.weather.forecast([POINT])

    assert not slow.release.is_set()
    assert set(result) == {POINT}
    slow.release.set()


def test_a_request_that_needs_a_fetch_gives_up_when_a_slow_fetch_holds_the_line(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """PERF-05"""
    slow = SlowFetch()
    slow.begin()
    monkeypatch.setattr("providers.weather.open_meteo.WEATHER_TOTAL_TIMEOUT_S", 0.2)

    with pytest.raises(WeatherUnavailable):
        slow.service.weather.forecast([GeoPoint(43.0, -89.0)])

    slow.release.set()


def test_very_large_requests_are_split_to_keep_the_address_short() -> None:
    points = [GeoPoint(30 + index / 10, -90.0) for index in range(POINTS_PER_REQUEST + 1)]
    service = Service(
        lambda request: answer(*[location()] * len(request.url.params["latitude"].split(",")))
    )

    result = service.weather.forecast(points)

    assert len(result) == len(points)
    assert len(service.requests) == 2


def test_time_running_out_between_chunks_keeps_the_cells_already_fetched(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """RR-11: cells that never arrived are simply absent, so they rate as no data"""
    stopwatch = FakeStopwatch(monkeypatch)
    service = Service(stopwatch.respond_taking(WEATHER_TOTAL_TIMEOUT_S))
    points = two_chunks_of_points()

    result = service.weather.forecast(points)

    assert len(service.requests) == 1
    assert len(result) == POINTS_PER_REQUEST
    assert POINT not in result


def test_cells_kept_from_an_earlier_chunk_are_cached_for_the_retry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    stopwatch = FakeStopwatch(monkeypatch)
    service = Service(stopwatch.respond_taking(WEATHER_TOTAL_TIMEOUT_S))
    points = two_chunks_of_points()
    service.weather.forecast(points)
    stopwatch.seconds = 0.0

    retried = service.weather.forecast(points)

    assert len(retried) == len(points)
    assert len(service.requests) == 2


def test_too_little_time_for_even_the_first_chunk_means_unavailable_and_no_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """PERF-05"""
    FakeStopwatch(monkeypatch)
    monkeypatch.setattr("providers.weather.open_meteo.WEATHER_TOTAL_TIMEOUT_S", 1.0)
    service = Service()

    with pytest.raises(WeatherUnavailable):
        service.weather.forecast([POINT])

    assert service.requests == []
