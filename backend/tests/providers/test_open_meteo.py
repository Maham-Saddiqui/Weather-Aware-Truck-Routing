import json
import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import httpx
import pytest

from domain.types import GeoPoint
from providers.http import make_client
from providers.weather.budget import BudgetLimit, WeatherBudget
from providers.weather.cache import WindowCache
from providers.weather.open_meteo import POINTS_PER_REQUEST, OpenMeteoWeather
from providers.weather.port import WeatherBusy, WeatherUnavailable

NOW = datetime(2026, 11, 11, 14, 25, tzinfo=UTC)
FIRST_HOUR = int(datetime(2026, 11, 11, 14, 0, tzinfo=UTC).timestamp())
POINT = GeoPoint(41.0, -87.0)
OTHER_POINT = GeoPoint(42.0, -88.0)


def location(hours: int = 3, **series: str) -> str:
    """Provider JSON as text, so numbers keep their exact spelling like the real service's."""
    columns = {
        "time": json.dumps([FIRST_HOUR + 3600 * hour for hour in range(hours)]),
        "wind_speed_10m": "[10.5, 11.5, 12.5]",
        "wind_gusts_10m": "[20.5, 21.5, 22.5]",
        "rain": "[0.1, 0.0, 0.0]",
        "showers": "[0.2, 0.0, 0.0]",
        "snowfall": "[0.0, 0.01, 0.0]",
        **series,
    }
    return '{"hourly": {' + ", ".join(f'"{name}": {text}' for name, text in columns.items()) + "}}"


def answer(*locations: str) -> httpx.Response:
    body = locations[0] if len(locations) == 1 else "[" + ",".join(locations) + "]"
    return httpx.Response(200, text=body)


def one_location_per_point(request: httpx.Request) -> httpx.Response:
    return answer(*[location()] * len(request.url.params["latitude"].split(",")))


class Service:
    def __init__(
        self,
        respond: Callable[[httpx.Request], httpx.Response] | None = None,
        budget: WeatherBudget | None = None,
    ) -> None:
        self.requests: list[httpx.Request] = []
        self.clock = [NOW]
        self._respond = respond or one_location_per_point
        transport = httpx.MockTransport(self._handle)
        cache = WindowCache(lambda: self.clock[0])
        self.weather = OpenMeteoWeather(
            "https://weather.test",
            make_client(1.0, transport),
            cache,
            lambda: self.clock[0],
        )
        if budget is not None:
            self.weather.limited_by(budget)

    def _handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return self._respond(request)


def failing(status: int) -> Service:
    return Service(lambda request: httpx.Response(status))


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


class SlowFetch:
    """A service whose fetch for OTHER_POINT hangs until `release` is set."""

    def __init__(self) -> None:
        self.started = threading.Event()
        self.release = threading.Event()
        self.service = Service(self._respond)

    def _respond(self, request: httpx.Request) -> httpx.Response:
        if request.url.params["latitude"] == "42.0":
            self.started.set()
            self.release.wait(timeout=5)
        return one_location_per_point(request)

    def begin(self) -> None:
        self.service.weather.forecast([POINT])
        threading.Thread(target=self.service.weather.forecast, args=([OTHER_POINT],)).start()
        assert self.started.wait(timeout=5)


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


def test_too_many_requests_is_its_own_case() -> None:
    with pytest.raises(WeatherBusy):
        failing(429).weather.forecast([POINT])


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


def test_an_answer_without_any_hourly_data_leaves_the_point_absent() -> None:
    service = Service(lambda request: httpx.Response(200, text="{}"))

    assert service.weather.forecast([POINT]) == {}
