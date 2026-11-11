import Skeleton from '@mui/material/Skeleton'
import { Suspense } from 'react'
import { MapUnavailable, RouteMap } from '../features/map'
import { ErrorBoundary } from './ErrorBoundary'
import type { TripPlannerState } from './useTripPlanner'

type MapPlanner = Pick<
  TripPlannerState,
  'results' | 'selectedRouteId' | 'selectedCheckpointIndex' | 'selectRoute' | 'selectCheckpoint'
>

export function MapPane({ planner, hourOffset }: { planner: MapPlanner; hourOffset: number }) {
  return (
    <ErrorBoundary area="the map" fallback={<MapUnavailable />}>
      <Suspense fallback={<Skeleton variant="rectangular" height="100%" />}>
        <RouteMap
          routes={planner.results.routes}
          selectedRouteId={planner.selectedRouteId}
          selectedCheckpointIndex={planner.selectedCheckpointIndex}
          heatmap={planner.results.heatmap}
          hourOffset={hourOffset}
          onSelectRoute={planner.selectRoute}
          onSelectCheckpoint={planner.selectCheckpoint}
        />
      </Suspense>
    </ErrorBoundary>
  )
}
