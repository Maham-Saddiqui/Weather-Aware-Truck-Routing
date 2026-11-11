from zoneinfo import ZoneInfo

import pytest

from domain.types import GeoPoint
from providers.timezone.offline import OfflineTimeZoneLookup, TimeZoneNotFound
from providers.timezone.port import TimeZoneLookup

lookup: TimeZoneLookup = OfflineTimeZoneLookup()


@pytest.mark.parametrize(
    ("place", "point", "zone"),
    [
        ("Dallas", GeoPoint(32.78, -96.80), "America/Chicago"),
        ("Denver", GeoPoint(39.74, -104.99), "America/Denver"),
        ("Los Angeles", GeoPoint(34.05, -118.24), "America/Los_Angeles"),
        ("New York", GeoPoint(40.71, -74.01), "America/New_York"),
        ("Phoenix", GeoPoint(33.45, -112.07), "America/Phoenix"),
    ],
)
def test_rr18_the_zone_of_a_place_is_found_offline_from_its_coordinates(
    place: str, point: GeoPoint, zone: str
) -> None:
    """RR-18: the departure picker uses the origin's zone, not the browser's."""
    assert lookup.zone_name(point) == zone, place


def test_rr18_every_zone_found_is_a_valid_iana_name() -> None:
    """RR-18."""
    name = lookup.zone_name(GeoPoint(41.88, -87.63))

    assert ZoneInfo(name).key == name


def test_rr18_a_place_that_no_zone_covers_is_reported_in_plain_words(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """RR-18."""
    monkeypatch.setattr("providers.timezone.offline.get_tz", lambda _lon, _lat: "")

    with pytest.raises(TimeZoneNotFound, match="No time zone covers this place"):
        lookup.zone_name(GeoPoint(0.0, 0.0))
