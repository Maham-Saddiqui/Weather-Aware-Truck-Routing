import Skeleton from '@mui/material/Skeleton'
import { lazy, Suspense } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import type { TripPlannerState } from './useTripPlanner'

const RouteMap = lazy(() =>
  import('../features/map').then((module) => ({ default: module.RouteMap })),
)

export function MapPane({ planner }: { planner: TripPlannerState }) {
  return (
    <ErrorBoundary area="the map">
      <Suspense fallback={<Skeleton variant="rectangular" height="100%" />}>
        <RouteMap
          routes={planner.results.routes}
          selectedRouteId={planner.selectedRouteId}
          selectedCheckpointIndex={planner.selectedCheckpointIndex}
          heatmap={planner.results.heatmap}
          hourOffset={planner.hourOffset}
          onSelectRoute={planner.selectRoute}
          onSelectCheckpoint={planner.selectCheckpoint}
        />
      </Suspense>
    </ErrorBoundary>
  )
}
