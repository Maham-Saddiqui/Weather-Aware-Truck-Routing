import { skipToken, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { api } from '../../shared/api/client'
import { useHealth } from '../../shared/api/useHealth'
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

  const hasRun = run !== null
  const { data: primaryData, error: primaryError, isError: primaryFailed } = primary
  const { data: compareData, error: compareError, isError: compareFailed } = compare
  const results = useMemo(
    () =>
      deriveTripResults(
        { data: primaryData, error: primaryError, isError: primaryFailed },
        { data: compareData, error: compareError, isError: compareFailed },
        hasRun,
      ),
    [primaryData, primaryError, primaryFailed, compareData, compareError, compareFailed, hasRun],
  )
  const { isAwake, pingIfStale } = useHealth()
  useEffect(() => {
    if (run) pingIfStale()
  }, [run, pingIfStale])
  const isServerWaking = useElapsedFlag(
    results.phase === 'loading' && !isAwake,
    SERVER_WAKING_DELAY_MS,
  )
  return { ...results, isPending: primary.isFetching || compare.isFetching, isServerWaking }
}
