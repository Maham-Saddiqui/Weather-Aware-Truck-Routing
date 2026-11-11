import type {
  Checkpoint,
  CompareTripResponse,
  Heatmap,
  PrimaryTripResponse,
  Recommendation,
  Route,
} from '../types'

const ZERO_MILES = {
  low: '0',
  moderate: '0',
  high: '0',
  severe: '0',
  no_travel: '0',
  no_data: '0',
}

export function makeCheckpoint(overrides: Partial<Checkpoint> = {}): Checkpoint {
  return {
    index: 0,
    distance_miles: '0',
    covered_miles: '12.5',
    position: { lat: 41.88, lon: -87.63 },
    eta_utc: '2026-11-12T14:00:00Z',
    time_zone: 'America/Chicago',
    measurements: { wind_mph: '12', rain_in_hr: '0.00', snow_in_hr: '0.00', gust_mph: '18' },
    level: 'low',
    driving_factors: [],
    load_rule: 'none',
    ...overrides,
  }
}

export function makeRoute(id: string, overrides: Partial<Route> = {}): Route {
  return {
    id,
    rank: 1,
    geometry: { encoding: 'encoded_polyline', precision: 5, data: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
    summary: {
      distance_miles: '60.0',
      travel_time_s: 4200,
      travel_time_text: '1 h 10 min',
      travel_time_difference_text: null,
      arrival_utc: '2026-11-12T15:10:00Z',
      miles_by_level: { ...ZERO_MILES, low: '42.5', moderate: '17.5' },
      average_risk: '0.29',
      worst_level: 'moderate',
      eligible: true,
      ineligible_reason: null,
    },
    checkpoints: [
      makeCheckpoint(),
      makeCheckpoint({ index: 1, distance_miles: '25', covered_miles: '25', level: 'moderate' }),
      makeCheckpoint({ index: 2, distance_miles: '60', covered_miles: '22.5' }),
    ],
    ...overrides,
  }
}

const NO_DATA_DIGIT = 'x'
const HEATMAP_HOURS = 49
const DEFAULT_START_UTC = '2026-11-12T14:00:00Z'

// Same rule as the server (RR-28): per hour the highest digit over all points, x when none has data.
function worstDigitsByHour(risks: readonly string[]): string {
  return Array.from({ length: HEATMAP_HOURS }, (_, hour) => {
    const digits = risks
      .map((risk) => risk.charAt(hour))
      .filter((digit) => digit !== '' && digit !== NO_DATA_DIGIT)
    return digits.sort().at(-1) ?? NO_DATA_DIGIT
  }).join('')
}

export function makeHeatmap(
  points: Heatmap['points'],
  startUtc: string = DEFAULT_START_UTC,
): Heatmap {
  return {
    start_utc: startUtc,
    hours: HEATMAP_HOURS,
    worst_level_by_hour: worstDigitsByHour(points.map((point) => point.risk)),
    points,
  }
}

export function makeHeatmapOfRisks(...risks: string[]): Heatmap {
  return makeHeatmap(
    risks.map((risk, index) => ({ position: { lat: 40, lon: -100 + index }, risk })),
  )
}

export const HEATMAP: Heatmap = makeHeatmap([
  { position: { lat: 41.88, lon: -87.63 }, risk: '0'.repeat(HEATMAP_HOURS) },
])

export const RECOMMENDATION: Recommendation = {
  status: 'recommended',
  route_id: 'route-a',
  least_bad_route_id: null,
  deciding_criterion: 'severe_miles',
  sentence: 'Route 1 has fewer Severe-weather miles than Route 2 (0.0 against 10.0 miles).',
}

export function makePrimaryResponse(route: Route = makeRoute('route-a')): PrimaryTripResponse {
  return {
    route: { ...route, rank: null },
    heatmap: HEATMAP,
    routing_provider: 'tomtom',
    weather: { status: 'ok' },
  }
}

export function makeCompareResponse(
  routes: Route[] = [makeRoute('route-a'), makeRoute('route-b', { rank: 2 })],
): CompareTripResponse {
  return {
    routes,
    recommendation: RECOMMENDATION,
    heatmap: HEATMAP,
    routing_provider: 'tomtom',
    weather: { status: 'ok' },
  }
}
