import { TripForm } from '../features/trip-form'
import { ErrorBoundary } from './ErrorBoundary'
import { MapWithSlider } from './MapWithSlider'
import { PlannerLayout } from './PlannerLayout'
import { ResultsPane } from './ResultsPane'
import { useTripPlanner } from './useTripPlanner'

export function TripPlanner() {
  const planner = useTripPlanner()
  return (
    <PlannerLayout
      form={
        <ErrorBoundary area="the trip form">
          <TripForm
            initialTrip={planner.restored?.trip ?? null}
            needsReview={planner.restored?.isPlannable === false}
            isBusy={planner.results.isPending}
            onSubmit={planner.submit}
          />
        </ErrorBoundary>
      }
      results={<ResultsPane planner={planner} />}
      map={<MapWithSlider planner={planner} />}
    />
  )
}
