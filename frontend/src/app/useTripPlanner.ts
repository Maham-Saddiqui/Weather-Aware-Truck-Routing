import { useCallback, useState } from 'react'
import { useTripResults } from '../features/route-results'
import { departureError } from '../features/trip-form'
import { dayjs } from '../shared/time'
import type { TripRequest, TripRun } from '../shared/types'
import { encodeTrip, parseTrip } from './tripUrl'

interface Selection {
  routeId: string | null
  checkpointIndex: number | null
}

interface RestoredTrip {
  trip: TripRequest
  isPlannable: boolean
}

function restoreTrip(): RestoredTrip | null {
  const trip = parseTrip(window.location.search)
  if (!trip) return null
  return { trip, isPlannable: departureError(dayjs(trip.departure_utc), dayjs()) === undefined }
}

// A sandboxed or privacy-hardened page may forbid rewriting its address; the trip must still run, only the link is lost.
function writeTripToAddress(trip: TripRequest) {
  try {
    window.history.replaceState(null, '', `?${encodeTrip(trip)}`)
  } catch {
    return
  }
}

export function useTripPlanner() {
  const [restored] = useState(restoreTrip)
  const [run, setRun] = useState<TripRun | null>(
    restored?.isPlannable ? { trip: restored.trip, runId: 1 } : null,
  )
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
    restored,
    results,
    selectedRouteId,
    selectedCheckpointIndex:
      selection.routeId === selectedRouteId ? selection.checkpointIndex : null,
    submit: (trip: TripRequest) => {
      writeTripToAddress(trip)
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
