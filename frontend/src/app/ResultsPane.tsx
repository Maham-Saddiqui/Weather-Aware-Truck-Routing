import { RouteResults } from '../features/route-results'
import { ErrorBoundary } from './ErrorBoundary'
import type { TripPlannerState } from './useTripPlanner'

export function ResultsPane({ planner }: { planner: TripPlannerState }) {
  return (
    <ErrorBoundary area="the results">
      <RouteResults
        results={planner.results}
        selectedRouteId={planner.selectedRouteId}
        selectedCheckpointIndex={planner.selectedCheckpointIndex}
        onSelectRoute={planner.selectRoute}
        onSelectCheckpoint={planner.selectCheckpoint}
        onRetry={planner.retry}
      />
    </ErrorBoundary>
  )
}
