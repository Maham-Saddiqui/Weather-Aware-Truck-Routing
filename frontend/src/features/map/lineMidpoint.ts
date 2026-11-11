import type { LonLat } from './polyline'

type Points = readonly (readonly number[])[]

function lengthBetween(from: readonly number[], to: readonly number[]): number {
  const [fromLon = 0, fromLat = 0] = from
  const [toLon = 0, toLat = 0] = to
  const eastWestShrink = Math.cos(((fromLat + toLat) / 2) * (Math.PI / 180))
  return Math.hypot((toLon - fromLon) * eastWestShrink, toLat - fromLat)
}

function between(from: readonly number[], to: readonly number[], share: number): LonLat {
  const [fromLon = 0, fromLat = 0] = from
  const [toLon = 0, toLat = 0] = to
  return [fromLon + (toLon - fromLon) * share, fromLat + (toLat - fromLat) * share]
}

// Display geometry only: the point half way along the drawn line, where a route's name is placed.
export function lineMidpoint(points: Points): LonLat | null {
  const first = points[0]
  if (!first) {
    return null
  }
  const segmentLengths = points
    .slice(1)
    .map((point, index) => lengthBetween(points[index] ?? first, point))
  let remaining = segmentLengths.reduce((total, length) => total + length, 0) / 2
  for (const [index, length] of segmentLengths.entries()) {
    if (remaining <= length) {
      return between(
        points[index] ?? first,
        points[index + 1] ?? first,
        length === 0 ? 0 : remaining / length,
      )
    }
    remaining -= length
  }
  return between(first, first, 0)
}
