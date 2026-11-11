import pytest

from domain.types import GeoPoint
from providers.routing.polyline import decode_polyline
from tests.fakes.polyline import encode_polyline

POINTS = (GeoPoint(38.5, -120.2), GeoPoint(40.7, -120.95), GeoPoint(43.252, -126.453))


def test_a_known_encoded_line_decodes_to_its_points() -> None:
    assert decode_polyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@", 5) == POINTS


@pytest.mark.parametrize("precision", [5, 6])
def test_decoding_reverses_encoding_at_either_precision(precision: int) -> None:
    assert decode_polyline(encode_polyline(POINTS, precision), precision) == POINTS


def test_a_line_cut_short_is_rejected() -> None:
    with pytest.raises(ValueError, match="ends in the middle"):
        decode_polyline("_p~iF~ps|U_ulL", 5)
