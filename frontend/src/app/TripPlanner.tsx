import { TripForm } from '../features/trip-form'
import { ErrorBoundary } from './ErrorBoundary'
import { heatmapSliderFor } from './heatmapSliderFor'
import { MapPane } from './MapPane'
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
            initialTrip={planner.run?.trip ?? null}
            isBusy={planner.results.isPending}
            onSubmit={planner.submit}
          />
        </ErrorBoundary>
      }
      results={<ResultsPane planner={planner} />}
      map={<MapPane planner={planner} />}
      slider={heatmapSliderFor(planner)}
    />
  )
}
