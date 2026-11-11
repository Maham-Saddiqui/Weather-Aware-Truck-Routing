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

const PILL_HALF_WIDTH_PX = 30
const PILL_HALF_HEIGHT_PX = 12
// A checkpoint dot is about 24 px across and the selected one 34 px.
const DOT_CLEARANCE_PX = 20

function nearestIndex(points: readonly (readonly number[])[], spot: LonLat): number {
  let nearest = 0
  points.forEach((point, index) => {
    if (distanceBetween(point, spot) < distanceBetween(points[nearest] ?? point, spot)) {
      nearest = index
    }
  })
  return nearest
}

// Where to shift a pill sideways so it sits beside its line, not on the checkpoint dots: up when the line runs across
// the screen, to the right when it runs up and down. Display geometry only (north is up, so latitude stretches by 1 / cos).
export function sideOffset(points: readonly (readonly number[])[], spot: LonLat): [number, number] {
  const middle = nearestIndex(points, spot)
  const [fromLon = 0, fromLat = 0] = points[Math.max(0, middle - 1)] ?? []
  const [toLon = 0, toLat = 0] = points[Math.min(points.length - 1, middle + 1)] ?? []
  const across = (toLon - fromLon) * Math.cos((spot[1] * Math.PI) / 180)
  const up = toLat - fromLat
  const length = Math.hypot(across, up) || 1
  const sideways = up / length
  const vertical = across / length
  const pointsDown = vertical > 0 || (vertical === 0 && sideways < 0)
  const flip = pointsDown ? -1 : 1
  const distance =
    Math.abs(sideways) * PILL_HALF_WIDTH_PX +
    Math.abs(vertical) * PILL_HALF_HEIGHT_PX +
    DOT_CLEARANCE_PX
  return [flip * sideways * distance, flip * vertical * distance]
}
