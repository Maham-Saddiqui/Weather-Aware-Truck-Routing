from datetime import timedelta
from decimal import Decimal

import httpx
import pytest

from providers.weather.budget import BudgetLimit, WeatherBudget
from providers.weather.open_meteo import RATE_LIMIT_REASON_MAX_CHARS
from providers.weather.port import WeatherBusy, WeatherUnavailable
from tests.fakes.logs import capture_events, events
from tests.fakes.open_meteo import NOW, OTHER_POINT, POINT, Service, failing, location


def test_too_many_requests_is_its_own_case() -> None:
    with pytest.raises(WeatherBusy):
        failing(429).weather.forecast([POINT])


@pytest.mark.parametrize(
    ("answer", "reason"),
    [
        (
            httpx.Response(
                429, json={"error": True, "reason": "Daily API request limit exceeded."}
            ),
            "Daily API request limit exceeded.",
        ),
        (httpx.Response(429, text="not json"), ""),
        (httpx.Response(429, json=["unexpected"]), ""),
        (httpx.Response(429, json={"reason": "x" * 500}), "x" * RATE_LIMIT_REASON_MAX_CHARS),
    ],
)
def test_too_many_requests_logs_the_providers_reason(
    answer: httpx.Response, reason: str, caplog: pytest.LogCaptureFixture
) -> None:
    capture_events(caplog)
    service = Service(lambda request: answer)

    with pytest.raises(WeatherBusy):
        service.weather.forecast([POINT])

    assert events(caplog, "weather_rate_limited") == [{"reason": reason, "level": "WARNING"}]


@pytest.mark.parametrize("status", [400, 500, 503])
def test_other_failures_mean_unavailable(status: int) -> None:
    with pytest.raises(WeatherUnavailable):
        failing(status).weather.forecast([POINT])


@pytest.mark.parametrize(
    "text",
    ["not json", '{"hourly": {"time": [1]}}', "[]", location(wind_speed_10m="[1.0]")],
)
def test_an_answer_we_cannot_read_means_unavailable(text: str) -> None:
    service = Service(lambda request: httpx.Response(200, text=text))

    with pytest.raises(WeatherUnavailable):
        service.weather.forecast([POINT])


MALFORMED_ANSWERS = [
    "5",
    "null",
    '"a page of text"',
    '["text"]',
    "[1]",
    "[null]",
    '{"hourly": null}',
    '{"hourly": []}',
    '{"hourly": "abc"}',
    location(time="5"),
    location(time='"abc"'),
    location(time="[1.5, 2, 3]"),
    location(time="[true, 2, 3]"),
    location(time="[99999999999999999999, 2, 3]"),
    location(wind_speed_10m='"abc"'),
    location(wind_speed_10m="[true, 1, 2]"),
    location(wind_speed_10m="[NaN, 1, 2]"),
    location(wind_gusts_10m="[Infinity, 1, 2]"),
    location(rain='{"a": 1, "b": 2, "c": 3}'),
    location(snowfall="[[1], 2, 3]"),
    location(showers='["0.1", 0, 0]'),
    "[" * 5_000,
]


@pytest.mark.parametrize("text", MALFORMED_ANSWERS)
def test_an_answer_of_the_wrong_shape_means_unavailable_and_nothing_is_cached(text: str) -> None:
    service = Service(lambda request: httpx.Response(200, text=text))

    with pytest.raises(WeatherUnavailable):
        service.weather.forecast([POINT])
    with pytest.raises(WeatherUnavailable):
        service.weather.forecast([POINT])

    assert len(service.requests) == 2


def test_a_body_that_cannot_be_decoded_means_unavailable() -> None:
    def broken(request: httpx.Request) -> httpx.Response:
        raise httpx.DecodingError("synthetic broken gzip", request=request)

    with pytest.raises(WeatherUnavailable):
        Service(broken).weather.forecast([POINT])


def test_a_network_error_is_retried_once_then_reported_as_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("providers.http.time.sleep", lambda seconds: None)

    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("synthetic", request=request)

    service = Service(refuse)

    with pytest.raises(WeatherUnavailable):
        service.weather.forecast([POINT])

    assert len(service.requests) == 2


def test_a_forecast_builds_no_decimals_until_a_reading_is_asked_for(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """RR-02"""
    built: list[str] = []

    def counting_decimal(text: str) -> Decimal:
        built.append(text)
        return Decimal(text)

    service = Service()
    service.weather.forecast([POINT, OTHER_POINT])
    monkeypatch.setattr("providers.weather.series.Decimal", counting_decimal)

    windows = service.weather.forecast([POINT, OTHER_POINT])
    assert built == []

    assert windows[POINT].wind_mph[2] == Decimal("12.5")
    assert built == ["12.5"]


def test_a_spent_weather_budget_means_busy_and_no_provider_call() -> None:
    """SEC-07"""
    budget = WeatherBudget([BudgetLimit(timedelta(minutes=1), 1)], lambda: NOW)
    service = Service(budget=budget)

    with pytest.raises(WeatherBusy):
        service.weather.forecast([POINT, OTHER_POINT])

    assert service.requests == []


def test_cached_cells_cost_no_weather_budget() -> None:
    """SEC-07"""
    budget = WeatherBudget([BudgetLimit(timedelta(minutes=1), 1)], lambda: NOW)
    service = Service(budget=budget)
    service.weather.forecast([POINT])

    assert set(service.weather.forecast([POINT])) == {POINT}
