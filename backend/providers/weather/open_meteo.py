import json
import threading
from collections.abc import Callable, Iterable, Mapping, Sequence
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from time import monotonic
from typing import Any

import httpx

from domain.heatmap import cell_of
from domain.types import GeoPoint, HourlyWeather
from providers.http import QueryParams, get_with_one_retry
from providers.weather.budget import WeatherBudget
from providers.weather.cache import CellKey, WindowCache
from providers.weather.port import WeatherBusy, WeatherUnavailable
from providers.weather.series import CompactSeries

OPEN_METEO_BASE_URL = "https://api.open-meteo.com"
OPEN_METEO_READ_TIMEOUT_S = 5.0
WEATHER_TOTAL_TIMEOUT_S = 12.0
WINDOW_HOURS = 240
POINTS_PER_REQUEST = 200
HOURLY_VARIABLES = "wind_speed_10m,wind_gusts_10m,rain,showers,snowfall"
HTTP_OK = 200
HTTP_TOO_MANY_REQUESTS = 429

type JsonObject = dict[str, Any]


class OpenMeteoWeather:
    """One batched request per trip; cells already held in the cache cost no call (PERF-04)."""

    def __init__(
        self,
        base_url: str,
        client: httpx.Client,
        cache: WindowCache,
        clock: Callable[[], datetime],
    ) -> None:
        self._base_url = base_url
        self._client = client
        self._cache = cache
        self._clock = clock
        self._budget = WeatherBudget((), clock)
        self._fetch_lock = threading.Lock()

    def limited_by(self, budget: WeatherBudget) -> "OpenMeteoWeather":
        """Without a budget every fetch is allowed; the server always sets one."""
        self._budget = budget
        return self

    def forecast(self, points: Sequence[GeoPoint]) -> Mapping[GeoPoint, HourlyWeather]:
        deadline = monotonic() + WEATHER_TOTAL_TIMEOUT_S
        cell_of_point = {point: _cell(point) for point in points}
        cells = set(cell_of_point.values())
        windows = self._cached(cells)
        if len(windows) < len(cells):
            windows = self._fetch_missing(cells, deadline)
        return {
            point: _expand(windows[cell])
            for point, cell in cell_of_point.items()
            if cell in windows
        }

    def _cached(self, cells: set[CellKey]) -> dict[CellKey, str]:
        return {cell: text for cell in cells if (text := self._cache.get(cell)) is not None}

    def _fetch_missing(self, cells: set[CellKey], deadline: float) -> dict[CellKey, str]:
        """Only one fetch at a time, and the cache is read again inside the lock, so identical
        concurrent requests share one provider call while fully cached ones never wait."""
        if not self._fetch_lock.acquire(timeout=max(deadline - monotonic(), 0)):
            raise WeatherUnavailable("The weather service is too slow")
        try:
            windows = self._cached(cells)
            self._fetch_chunks(sorted(cells - windows.keys()), windows, deadline)
            return windows
        finally:
            self._fetch_lock.release()

    def _fetch_chunks(
        self, missing: Sequence[CellKey], windows: dict[CellKey, str], deadline: float
    ) -> None:
        """Stops when time runs out and keeps what earlier chunks brought; cells left unfetched
        stay absent, which the ratings show as no data (RR-11)."""
        for index, chunk in enumerate(_chunks(missing, POINTS_PER_REQUEST)):
            if deadline - monotonic() < OPEN_METEO_READ_TIMEOUT_S:
                if index == 0:
                    raise WeatherUnavailable("The weather service is too slow")
                return
            if not self._budget.try_spend(len(chunk)):
                raise WeatherBusy("The weather allowance is spent for now")
            for cell, text in self._fetch(chunk).items():
                self._cache.put(cell, text)
                windows[cell] = text

    def _fetch(self, cells: Sequence[CellKey]) -> dict[CellKey, str]:
        try:
            response = get_with_one_retry(
                self._client, self._base_url + "/v1/forecast", self._params(cells)
            )
        except httpx.TransportError:
            raise WeatherUnavailable("The weather service could not be reached") from None
        if response.status_code == HTTP_TOO_MANY_REQUESTS:
            raise WeatherBusy("The weather service is busy")
        if response.status_code != HTTP_OK:
            raise WeatherUnavailable(f"The weather service answered {response.status_code}")
        return _compact_by_cell(cells, response.text)

    def _params(self, cells: Sequence[CellKey]) -> QueryParams:
        start = self._clock().astimezone(UTC).replace(minute=0, second=0, microsecond=0)
        end = start + timedelta(hours=WINDOW_HOURS - 1)
        return {
            "latitude": ",".join(str(lat) for lat, _ in cells),
            "longitude": ",".join(str(lon) for _, lon in cells),
            "hourly": HOURLY_VARIABLES,
            "wind_speed_unit": "mph",
            "precipitation_unit": "inch",
            "timeformat": "unixtime",
            "timezone": "GMT",
            "start_hour": start.strftime("%Y-%m-%dT%H:%M"),
            "end_hour": end.strftime("%Y-%m-%dT%H:%M"),
        }


def _cell(point: GeoPoint) -> CellKey:
    snapped = cell_of(point)
    return (snapped.lat, snapped.lon)


def _chunks(cells: Sequence[CellKey], size: int) -> Iterable[Sequence[CellKey]]:
    return (cells[start : start + size] for start in range(0, len(cells), size))


def _compact_by_cell(cells: Sequence[CellKey], text: str) -> dict[CellKey, str]:
    try:
        body = json.loads(text, parse_float=Decimal)
        locations: list[JsonObject] = body if isinstance(body, list) else [body]
        if len(locations) != len(cells):
            raise ValueError("One answer per requested location expected")
        return {
            cell: _compact(location["hourly"])
            for cell, location in zip(cells, locations, strict=True)
            if location.get("hourly", {}).get("time")
        }
    except (
        KeyError,
        TypeError,
        ValueError,
        ArithmeticError,
        AttributeError,
        OSError,
        RecursionError,
    ):
        raise WeatherUnavailable("The weather service sent an answer we cannot read") from None


def _compact(hourly: JsonObject) -> str:
    """Rain plus showers in exact decimals (RR-02); a missing part stays missing.

    Anything that is not a plain number, or a first hour that is not a whole timestamp, is
    refused here, so only text that can be read back is ever cached.
    """
    wind, gust, rain, showers, snow = (
        _readings(hourly[name])
        for name in ("wind_speed_10m", "wind_gusts_10m", "rain", "showers", "snowfall")
    )
    rows: list[Sequence[Decimal | int | None]] = [
        wind,
        gust,
        [_add(r, s) for r, s in zip(rain, showers, strict=True)],
        snow,
    ]
    if any(len(row) != len(hourly["time"]) for row in rows):
        raise ValueError("Every series must cover every hour")
    lines = [",".join("" if value is None else str(value) for value in row) for row in rows]
    return "\n".join([str(_first_hour(hourly["time"])), *lines])


def _first_hour(times: list[Any]) -> int:
    first = times[0]
    if isinstance(first, bool) or not isinstance(first, int):
        raise ValueError("Hours must be whole timestamps")
    datetime.fromtimestamp(first, UTC)
    return first


def _readings(row: list[Any]) -> list[Decimal | int | None]:
    if not isinstance(row, list):
        raise TypeError("A series must be a list")
    for value in row:
        if value is not None and not _is_finite_number(value):
            raise ValueError("Readings must be finite numbers")
    return row


def _is_finite_number(value: object) -> bool:
    return (
        isinstance(value, int | Decimal)
        and not isinstance(value, bool)
        and Decimal(value).is_finite()
    )


def _add(first: Decimal | int | None, second: Decimal | int | None) -> Decimal | None:
    if first is None or second is None:
        return None
    return Decimal(first) + Decimal(second)


def _expand(window: str) -> HourlyWeather:
    first_hour, *rows = window.split("\n")
    wind, gust, rain, snow = (CompactSeries(row) for row in rows)
    return HourlyWeather(
        first_hour_utc=datetime.fromtimestamp(int(first_hour), UTC),
        wind_mph=wind,
        gust_mph=gust,
        rain_in=rain,
        snow_in=snow,
    )
