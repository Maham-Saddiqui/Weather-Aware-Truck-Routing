import { ShareTrip } from '../features/share-trip'
import { TripForm } from '../features/trip-form'
import { ErrorBoundary } from './ErrorBoundary'
import { MapWithSlider } from './MapWithSlider'
import { PlannerLayout } from './PlannerLayout'
import { ResultsPane } from './ResultsPane'
import { useTripPlanner } from './useTripPlanner'
import type { TripPlannerState } from './useTripPlanner'

function arrivalOf({ run, results }: TripPlannerState): string | null {
  if (results.phase === 'partial' || results.phase === 'complete') {
    return `${String(run?.runId)}-result`
  }
  return results.phase === 'failed' ? `${String(run?.runId)}-error` : null
}

export function TripPlanner() {
  const planner = useTripPlanner()
  return (
    <PlannerLayout
      arrival={arrivalOf(planner)}
      form={
        <ErrorBoundary area="the trip form">
          <TripForm
            initialTrip={planner.restored?.trip ?? null}
            needsReview={planner.restored?.isPlannable === false}
            isBusy={planner.results.isPending}
            onSubmit={planner.submit}
            summaryActions={<ShareTrip />}
          />
        </ErrorBoundary>
      }
      results={<ResultsPane planner={planner} />}
      map={<MapWithSlider planner={planner} />}
    />
  )
}
