from decimal import Decimal

from domain.levels import Level
from domain.rating import Measurements, measurements_at
from domain.types import HourlyWeather
from tests.domain.rating_builders import FIRST_HOUR, at, forecast, level_of


def test_rr02_wind_34_5_rounds_half_up_to_35_which_is_high() -> None:
    """RR-02."""
    assert level_of(measurements_at(forecast(wind=("34.5",) * 5), at(13))) is Level.HIGH


def test_rr02_wind_34_49_rounds_down_to_34_which_is_moderate() -> None:
    """RR-02."""
    assert level_of(measurements_at(forecast(wind=("34.49",) * 5), at(13))) is Level.MODERATE


def test_rr02_rain_0_245_rounds_half_up_to_0_25_which_is_high() -> None:
    """RR-02."""
    measurements = measurements_at(forecast(rain=("0.245",) * 5), at(13))

    assert measurements.rain_in == Decimal("0.25")
    assert level_of(measurements) is Level.HIGH


def test_rr02_rain_0_244_rounds_to_0_24_which_is_moderate() -> None:
    """RR-02."""
    assert level_of(measurements_at(forecast(rain=("0.244",) * 5), at(13))) is Level.MODERATE


def test_rr02_rain_0_495_rounds_half_up_to_0_50_which_is_severe() -> None:
    """RR-02."""
    assert level_of(measurements_at(forecast(rain=("0.495",) * 5), at(13))) is Level.SEVERE


def test_rr02_snow_and_gusts_are_rounded_once_for_display() -> None:
    """RR-02."""
    measurements = measurements_at(forecast(snow=("0.125",) * 5, gust=("40.5",) * 5), at(13))

    assert measurements.snow_in == Decimal("0.13")
    assert measurements.gust_mph == Decimal("41")


def test_rr17_arrival_13_20_uses_wind_at_13_00_and_rain_snow_at_14_00() -> None:
    """RR-17."""
    weather = forecast(
        wind=("0", "10", "20", "30", "40"),
        rain=("0", "0.11", "0.22", "0.33", "0.44"),
        snow=("0", "1", "2", "3", "4"),
    )

    measurements = measurements_at(weather, at(13, 20))

    assert measurements.wind_mph == Decimal("10")
    assert measurements.rain_in == Decimal("0.22")
    assert measurements.snow_in == Decimal("2.00")


def test_rr17_arrival_13_40_uses_wind_at_14_00_and_rain_snow_at_14_00() -> None:
    """RR-17."""
    weather = forecast(wind=("0", "10", "20", "30", "40"), rain=("0", "0.11", "0.22", "0.33", "0"))

    measurements = measurements_at(weather, at(13, 40))

    assert measurements.wind_mph == Decimal("20")
    assert measurements.rain_in == Decimal("0.22")


def test_rr17_arrival_exactly_13_00_uses_wind_at_13_00_and_rain_snow_at_14_00() -> None:
    """RR-17."""
    weather = forecast(wind=("0", "10", "20", "30", "40"), rain=("0", "0.11", "0.22", "0.33", "0"))

    measurements = measurements_at(weather, at(13))

    assert measurements.wind_mph == Decimal("10")
    assert measurements.rain_in == Decimal("0.22")


def test_rr17_arrival_exactly_13_30_rounds_the_wind_hour_half_up_to_14_00() -> None:
    """RR-17."""
    weather = forecast(wind=("0", "10", "20", "30", "40"))

    assert measurements_at(weather, at(13, 30)).wind_mph == Decimal("20")


def test_rr11_an_hour_outside_the_forecast_window_is_a_missing_reading() -> None:
    """RR-11."""
    weather = forecast()

    assert measurements_at(weather, at(11, 0)).wind_mph is None
    assert measurements_at(weather, at(16, 30)).rain_in is None
    assert measurements_at(weather, at(11, 20)).snow_in == Decimal("0.00")


def test_rr11_a_missing_value_inside_the_window_stays_missing() -> None:
    """RR-11."""
    weather = HourlyWeather(FIRST_HOUR, (None,), (None,), (None,), (None,))

    assert measurements_at(weather, at(12)) == Measurements(None, None, None, None)


def test_rr11_no_forecast_at_all_gives_missing_readings() -> None:
    """RR-11."""
    assert measurements_at(None, at(13)) == Measurements(None, None, None, None)
