import type {
  CompareTripResponse,
  Heatmap,
  PrimaryTripResponse,
  Recommendation,
  Route,
  RoutingProvider,
  WeatherStatus,
} from '../../shared/types'

export type ResultsPhase = 'idle' | 'loading' | 'partial' | 'complete' | 'failed'

export interface TripResults {
  phase: ResultsPhase
  routes: readonly Route[]
  recommendation: Recommendation | null
  heatmap: Heatmap | null
  routingProvider: RoutingProvider | null
  weather: WeatherStatus | null
  alternativesUnavailable: boolean
  isPending: boolean
  isServerWaking: boolean
  error: unknown
}

export interface QueryOutcome<Data> {
  data: Data | undefined
  error: unknown
  isError: boolean
}

export const EMPTY_RESULTS: TripResults = {
  phase: 'idle',
  routes: [],
  recommendation: null,
  heatmap: null,
  routingProvider: null,
  weather: null,
  alternativesUnavailable: false,
  isPending: false,
  isServerWaking: false,
  error: null,
}

function fromCompare(compare: CompareTripResponse): TripResults {
  return {
    ...EMPTY_RESULTS,
    phase: 'complete',
    routes: compare.routes,
    recommendation: compare.recommendation,
    heatmap: compare.heatmap,
    routingProvider: compare.routing_provider,
    weather: compare.weather.status,
  }
}

function fromPrimary(primary: PrimaryTripResponse, alternativesFailed: boolean): TripResults {
  return {
    ...EMPTY_RESULTS,
    phase: 'partial',
    routes: [primary.route],
    heatmap: primary.heatmap,
    routingProvider: primary.routing_provider,
    weather: primary.weather.status,
    alternativesUnavailable: alternativesFailed,
  }
}

export function deriveTripResults(
  primary: QueryOutcome<PrimaryTripResponse>,
  compare: QueryOutcome<CompareTripResponse>,
  hasRun: boolean,
): TripResults {
  if (!hasRun) return EMPTY_RESULTS
  if (compare.data) return fromCompare(compare.data)
  if (primary.data) return fromPrimary(primary.data, compare.isError)
  if (primary.isError && compare.isError) {
    return { ...EMPTY_RESULTS, phase: 'failed', error: compare.error }
  }
  return { ...EMPTY_RESULTS, phase: 'loading' }
}
