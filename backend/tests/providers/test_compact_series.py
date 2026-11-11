from decimal import Decimal

import pytest

from providers.weather.series import CompactSeries


def test_the_series_reads_exactly_like_the_tuple_it_replaces() -> None:
    """RR-02"""
    series = CompactSeries("10.5,,12.5,0")

    assert tuple(series) == (Decimal("10.5"), None, Decimal("12.5"), Decimal("0"))
    assert len(series) == 4
    assert series[-1] == Decimal("0")
    assert series[1:3] == (None, Decimal("12.5"))
    with pytest.raises(IndexError):
        series[4]


def test_a_reading_becomes_a_decimal_only_when_it_is_read(monkeypatch: pytest.MonkeyPatch) -> None:
    """RR-02"""
    built: list[str] = []

    def counting_decimal(text: str) -> Decimal:
        built.append(text)
        return Decimal(text)

    monkeypatch.setattr("providers.weather.series.Decimal", counting_decimal)
    series = CompactSeries(",".join(str(hour) for hour in range(240)))
    assert built == []

    assert series[7] == Decimal(7)
    assert built == ["7"]
