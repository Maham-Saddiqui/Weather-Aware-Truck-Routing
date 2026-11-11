import { RouteResults } from '../features/route-results'
import { TripForm } from '../features/trip-form'
import { ErrorBoundary } from './ErrorBoundary'
import { heatmapSliderFor } from './heatmapSliderFor'
import { MapPane } from './MapPane'
import { PlannerLayout } from './PlannerLayout'
import { useTripPlanner } from './useTripPlanner'

export function TripPlanner() {
  const planner = useTripPlanner()
  const { results } = planner

  return (
    <PlannerLayout
      form={
        <ErrorBoundary area="the trip form">
          <TripForm onSubmit={planner.submit} />
        </ErrorBoundary>
      }
      results={
        <ErrorBoundary area="the results">
          <RouteResults results={results} />
        </ErrorBoundary>
      }
      map={
        <MapPane
          routes={results.routes}
          selectedRouteId={planner.selectedRouteId}
          selectedCheckpointIndex={planner.selectedCheckpointIndex}
          heatmap={results.heatmap}
          hourOffset={planner.hourOffset}
          onSelectRoute={planner.selectRoute}
          onSelectCheckpoint={planner.selectCheckpoint}
        />
      }
      slider={heatmapSliderFor(results, planner.hourOffset, planner.setHourOffset)}
    />
  )
}
