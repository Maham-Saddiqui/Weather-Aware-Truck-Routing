import type { Checkpoint, Heatmap, Route } from '../../shared/types'
import { makeHeatmap } from '../../shared/testing/fixtures'
import type { LonLat } from './polyline'

const DEPARTURE_UTC = '2026-11-12T13:00:00Z'
const CHECKPOINT_EVERY_N_POINTS = 12
const MILES_PER_POINT = 2.5
const HOURS_IN_HEATMAP = 49
const LEVELS: readonly Checkpoint['level'][] = [
  'low',
  'low',
  'moderate',
  'high',
  'severe',
  'no_travel',
  'no_data',
]

const CHICAGO_TO_DENVER_NORTH: LonLat[] = [
  [-87.63, 41.88],
  [-90.58, 41.52],
  [-93.62, 41.59],
  [-95.93, 41.26],
  [-99.08, 40.7],
  [-103.2, 40.62],
  [-104.99, 39.74],
]

const CHICAGO_TO_DENVER_SOUTH: LonLat[] = [
  [-87.63, 41.88],
  [-90.2, 38.63],
  [-94.58, 39.1],
  [-97.61, 38.84],
  [-101.3, 39.0],
  [-104.99, 39.74],
]

function encodeNumber(value: number): string {
  let rest = value < 0 ? ~(value << 1) : value << 1
  let encoded = ''
  while (rest >= 0x20) {
    encoded += String.fromCharCode((0x20 | (rest & 0x1f)) + 63)
    rest >>= 5
  }
  return encoded + String.fromCharCode(rest + 63)
}

export function encodePolyline(points: readonly LonLat[], precision: number): string {
  const scale = 10 ** precision
  let previousLatitude = 0
  let previousLongitude = 0
  return points
    .map(([longitude, latitude]) => {
      const latitudeUnits = Math.round(latitude * scale)
      const longitudeUnits = Math.round(longitude * scale)
      const step =
        encodeNumber(latitudeUnits - previousLatitude) +
        encodeNumber(longitudeUnits - previousLongitude)
      previousLatitude = latitudeUnits
      previousLongitude = longitudeUnits
      return step
    })
    .join('')
}

function densify(waypoints: readonly LonLat[], stepsPerLeg: number): LonLat[] {
  const points: LonLat[] = []
  waypoints.slice(1).forEach(([toLon, toLat], legIndex) => {
    const [fromLon = 0, fromLat = 0] = waypoints[legIndex] ?? []
    for (let step = 0; step < stepsPerLeg; step += 1) {
      const share = step / stepsPerLeg
      points.push([fromLon + (toLon - fromLon) * share, fromLat + (toLat - fromLat) * share])
    }
  })
  points.push(waypoints.at(-1) ?? [0, 0])
  return points
}

function checkpointsAlong(points: readonly LonLat[], levelOffset: number): Checkpoint[] {
  const checkpointPoints = points.filter((_, index) => index % CHECKPOINT_EVERY_N_POINTS === 0)
  return checkpointPoints.map(([lon, lat], index) => {
    const miles = index * CHECKPOINT_EVERY_N_POINTS * MILES_PER_POINT
    return {
      index,
      distance_miles: miles.toFixed(1),
      covered_miles: '25.0',
      position: { lat, lon },
      eta_utc: new Date(Date.parse(DEPARTURE_UTC) + (miles / 55) * 3_600_000).toISOString(),
      time_zone: 'America/Chicago',
      measurements: { wind_mph: '12', rain_in_hr: '0.00', snow_in_hr: '0.0', gust_mph: '20' },
      level: LEVELS[(index + levelOffset) % LEVELS.length] ?? 'low',
      driving_factors: [],
      load_rule: 'none',
    }
  })
}

function makeRoute(id: string, waypoints: readonly LonLat[], levelOffset: number): Route {
  const points = densify(waypoints, 40)
  return {
    id,
    rank: null,
    geometry: { encoding: 'encoded_polyline', precision: 5, data: encodePolyline(points, 5) },
    summary: {
      distance_miles: '1003.0',
      travel_time_s: 64800,
      travel_time_text: '18 h 0 min',
      arrival_utc: '2026-11-13T07:00:00Z',
      miles_by_level: {
        low: '800.0',
        moderate: '100.0',
        high: '50.0',
        severe: '30.0',
        no_travel: '0.0',
        no_data: '23.0',
      },
      average_risk: '0.42',
      worst_level: 'severe',
      eligible: true,
      ineligible_reason: null,
    },
    checkpoints: checkpointsAlong(points, levelOffset),
  }
}

export const NORTH_ROUTE = makeRoute('route-north', CHICAGO_TO_DENVER_NORTH, 0)
export const SOUTH_ROUTE = makeRoute('route-south', CHICAGO_TO_DENVER_SOUTH, 3)
export const TWO_ROUTES: readonly Route[] = [NORTH_ROUTE, SOUTH_ROUTE]

export function riskStringFor(pointNumber: number): string {
  return Array.from({ length: HOURS_IN_HEATMAP }, (_, hour) => {
    const isMissing = (pointNumber * 7 + hour * 3) % 23 === 0
    return isMissing ? 'x' : String((pointNumber + hour) % 5)
  }).join('')
}

export function heatmapWithPoints(pointCount: number): Heatmap {
  const columns = 100
  return makeHeatmap(
    Array.from({ length: pointCount }, (_, pointNumber) => ({
      position: {
        lat: 32 + Math.floor(pointNumber / columns) * 1.2 + (pointNumber % columns) * 0.02,
        lon: -118 + (pointNumber % columns) * 0.4,
      },
      risk: riskStringFor(pointNumber),
    })),
    DEPARTURE_UTC,
  )
}

export function heatmapFromCheckpoints(routes: readonly Route[]): Heatmap {
  const positions = routes.flatMap((route) =>
    route.checkpoints.map((checkpoint) => checkpoint.position),
  )
  return makeHeatmap(
    positions.map((position, pointNumber) => ({ position, risk: riskStringFor(pointNumber) })),
    DEPARTURE_UTC,
  )
}
