from array import array
from collections.abc import Sequence
from decimal import Decimal
from itertools import accumulate
from typing import overload

FIELD_SEPARATOR = ","


class CompactSeries(Sequence[Decimal | None]):
    """One forecast series kept as its text; a reading becomes a Decimal only when it is read.

    A request touches a few dozen of the 240 hours of a cell, so the rest never costs memory.
    """

    def __init__(self, row: str) -> None:
        self._row = row
        self._ends = array("I", accumulate(len(field) + 1 for field in row.split(FIELD_SEPARATOR)))

    def __len__(self) -> int:
        return len(self._ends)

    @overload
    def __getitem__(self, index: int) -> Decimal | None: ...

    @overload
    def __getitem__(self, index: slice) -> tuple[Decimal | None, ...]: ...

    def __getitem__(self, index: int | slice) -> Decimal | tuple[Decimal | None, ...] | None:
        if isinstance(index, slice):
            return tuple(self[position] for position in range(*index.indices(len(self))))
        position = range(len(self))[index]
        start = self._ends[position - 1] if position else 0
        text = self._row[start : self._ends[position] - 1]
        return Decimal(text) if text else None
