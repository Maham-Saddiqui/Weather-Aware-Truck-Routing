import { skipToken, useQuery } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import { SERVER_WAKING_DELAY_MS } from '../../shared/constants'
import { useElapsedFlag } from '../../shared/timers'
import type { TripRun } from '../../shared/types'
import { deriveTripResults, type TripResults } from './tripResults'

export function useTripResults(run: TripRun | null): TripResults {
  const primary = useQuery({
    queryKey: ['trip', 'primary', run],
    queryFn: run ? ({ signal }) => api.planPrimaryTrip(run.trip, signal) : skipToken,
    gcTime: 0,
  })
  const compare = useQuery({
    queryKey: ['trip', 'compare', run],
    queryFn: run ? ({ signal }) => api.compareTrip(run.trip, signal) : skipToken,
    gcTime: 0,
  })

  const results = deriveTripResults(primary, compare, run !== null)
  const isServerWaking = useElapsedFlag(results.phase === 'loading', SERVER_WAKING_DELAY_MS)
  return { ...results, isServerWaking }
}
