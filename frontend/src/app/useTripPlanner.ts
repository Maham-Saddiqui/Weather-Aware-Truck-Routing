import { useState } from 'react'
import { useTripResults } from '../features/route-results'
import type { TripRequest, TripRun } from '../shared/types'

interface Selection {
  routeId: string | null
  checkpointIndex: number | null
}

export function useTripPlanner() {
  const [run, setRun] = useState<TripRun | null>(null)
  const [selection, setSelection] = useState<Selection>({ routeId: null, checkpointIndex: null })
  const [hourOffset, setHourOffset] = useState(0)
  const results = useTripResults(run)

  const hasSelectedRoute = results.routes.some((route) => route.id === selection.routeId)
  const selectedRouteId = hasSelectedRoute ? selection.routeId : (results.routes[0]?.id ?? null)

  return {
    run,
    results,
    selectedRouteId,
    selectedCheckpointIndex:
      selection.routeId === selectedRouteId ? selection.checkpointIndex : null,
    hourOffset,
    setHourOffset,
    submit: (trip: TripRequest) => {
      setRun((previous) => ({ trip, runId: (previous?.runId ?? 0) + 1 }))
      setHourOffset(0)
    },
    retry: () => {
      setRun((previous) => (previous ? { ...previous, runId: previous.runId + 1 } : null))
    },
    selectRoute: (routeId: string) => {
      setSelection({ routeId, checkpointIndex: null })
    },
    selectCheckpoint: (routeId: string, checkpointIndex: number) => {
      setSelection({ routeId, checkpointIndex })
    },
  }
}

export type TripPlannerState = ReturnType<typeof useTripPlanner>
