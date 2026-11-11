import { useCallback, useState } from 'react'
import { useTripResults } from '../features/route-results'
import type { TripRequest, TripRun } from '../shared/types'
import { encodeTrip, parseTrip } from './tripUrl'

interface Selection {
  routeId: string | null
  checkpointIndex: number | null
}

function restoreRun(): TripRun | null {
  const trip = parseTrip(window.location.search)
  return trip && { trip, runId: 1 }
}

export function useTripPlanner() {
  const [run, setRun] = useState<TripRun | null>(restoreRun)
  const [selection, setSelection] = useState<Selection>({ routeId: null, checkpointIndex: null })
  const results = useTripResults(run)

  const selectRoute = useCallback((routeId: string) => {
    setSelection({ routeId, checkpointIndex: null })
  }, [])
  const selectCheckpoint = useCallback((routeId: string, checkpointIndex: number) => {
    setSelection({ routeId, checkpointIndex })
  }, [])

  const hasSelectedRoute = results.routes.some((route) => route.id === selection.routeId)
  const selectedRouteId = hasSelectedRoute ? selection.routeId : (results.routes[0]?.id ?? null)

  return {
    run,
    results,
    selectedRouteId,
    selectedCheckpointIndex:
      selection.routeId === selectedRouteId ? selection.checkpointIndex : null,
    submit: (trip: TripRequest) => {
      window.history.replaceState(null, '', `?${encodeTrip(trip)}`)
      setRun((previous) => ({ trip, runId: (previous?.runId ?? 0) + 1 }))
    },
    retry: () => {
      setRun((previous) => (previous ? { ...previous, runId: previous.runId + 1 } : null))
    },
    selectRoute,
    selectCheckpoint,
  }
}

export type TripPlannerState = ReturnType<typeof useTripPlanner>
