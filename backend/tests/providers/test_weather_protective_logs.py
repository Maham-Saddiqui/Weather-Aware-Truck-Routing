import logging
from datetime import UTC, datetime, timedelta

import httpx
import pytest

from domain.types import GeoPoint
from providers.http import make_client
from providers.weather.budget import BudgetLimit, WeatherBudget
from providers.weather.cache import WindowCache
from providers.weather.open_meteo import OpenMeteoWeather
from providers.weather.port import WeatherBusy, WeatherUnavailable
from tests.fakes.logs import assert_nothing_sensitive_was_logged, events

NOW = datetime(2026, 11, 11, 14, 25, tzinfo=UTC)
POINTS = [GeoPoint(41.1234, -87.5678), GeoPoint(42.4321, -88.8765)]


def weather() -> OpenMeteoWeather:
    def never_called(request: httpx.Request) -> httpx.Response:
        raise AssertionError("the provider must not be called")

    client = make_client(1.0, httpx.MockTransport(never_called))
    return OpenMeteoWeather(
        "https://weather.example.test", client, WindowCache(lambda: NOW), lambda: NOW
    )


def test_a_spent_weather_budget_logs_how_many_locations_were_refused(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """SEC-07"""
    caplog.set_level(logging.INFO)
    budget = WeatherBudget([BudgetLimit(timedelta(minutes=1), 1)], lambda: NOW)

    with pytest.raises(WeatherBusy):
        weather().limited_by(budget).forecast(POINTS)

    (refused,) = events(caplog, "weather_budget_exceeded")
    assert (refused["locations"], refused["level"]) == (2, "WARNING")
    assert_nothing_sensitive_was_logged(caplog)


def test_running_out_of_weather_time_logs_how_many_chunks_were_fetched(
    caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    """PERF-05"""
    caplog.set_level(logging.INFO)
    monkeypatch.setattr("providers.weather.open_meteo.WEATHER_TOTAL_TIMEOUT_S", 1.0)

    with pytest.raises(WeatherUnavailable):
        weather().forecast(POINTS)

    (ran_out,) = events(caplog, "weather_time_ran_out")
    assert ran_out["chunks_fetched"] == 0
    assert_nothing_sensitive_was_logged(caplog)
