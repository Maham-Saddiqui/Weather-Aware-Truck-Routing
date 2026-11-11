import { distanceBetween, pointAlong } from './pointAlong'
import type { LonLat } from './polyline'
import type { RouteLines } from './routeGeoJson'

// Candidates stay off the first and last fifth of a line, where the pins and the other routes' ends crowd in.
const CANDIDATE_SHARES = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8]

function clearance(point: LonLat, avoid: readonly (readonly number[])[]): number {
  return avoid.reduce(
    (nearest, other) => Math.min(nearest, distanceBetween(point, other)),
    Infinity,
  )
}

function candidatesAlong(points: readonly (readonly number[])[]): LonLat[] {
  return CANDIDATE_SHARES.map((share) => pointAlong(points, share)).filter(
    (point) => point !== null,
  )
}

function farthestFrom(candidates: readonly LonLat[], avoid: readonly (readonly number[])[]) {
  let best = candidates[0] ?? null
  let bestClearance = -1
  for (const candidate of candidates) {
    const candidateClearance = clearance(candidate, avoid)
    if (candidateClearance > bestClearance) {
      best = candidate
      bestClearance = candidateClearance
    }
  }
  return best
}

// Each route's name sits at the point of its own line farthest from the other routes and from the names already
// placed, the selected route first, so names neither land on another line nor on each other. Display geometry only.
export function placePills(lines: RouteLines, selectedRouteId: string | null): Map<string, LonLat> {
  const placed = new Map<string, LonLat>()
  const inPlacementOrder = [...lines.features].sort(
    (a, b) =>
      Number(b.properties.routeId === selectedRouteId) -
      Number(a.properties.routeId === selectedRouteId),
  )
  for (const feature of inPlacementOrder) {
    const others = lines.features
      .filter((other) => other !== feature)
      .flatMap((other) => other.geometry.coordinates)
    const spot = farthestFrom(candidatesAlong(feature.geometry.coordinates), [
      ...others,
      ...placed.values(),
    ])
    if (spot) {
      placed.set(feature.properties.routeId, spot)
    }
  }
  return placed
}
