import { memo, useMemo } from 'react'
import type { Route } from '../../shared/types'
import { CheckpointMarkers } from './CheckpointMarkers'
import { FitToRoutes } from './FitToRoutes'
import { RouteLayers } from './RouteLayers'
import { routeLines } from './routeGeoJson'

export interface RouteSceneProps {
  routes: readonly Route[]
  selectedRouteId: string | null
  selectedCheckpointIndex: number | null
  onSelectCheckpoint: (routeId: string, checkpointIndex: number) => void
}

// Memoised so a slider tick (which only changes the hour) never redraws routes or markers (FE-08).
function RouteSceneView({
  routes,
  selectedRouteId,
  selectedCheckpointIndex,
  onSelectCheckpoint,
}: RouteSceneProps) {
  const lines = useMemo(() => routeLines(routes), [routes])
  const selectedRoute = routes.find((route) => route.id === selectedRouteId)
  return (
    <>
      <FitToRoutes lines={lines} />
      <RouteLayers lines={lines} selectedRouteId={selectedRouteId} />
      {selectedRoute && (
        <CheckpointMarkers
          route={selectedRoute}
          selectedCheckpointIndex={selectedCheckpointIndex}
          onSelectCheckpoint={onSelectCheckpoint}
        />
      )}
    </>
  )
}

export const RouteScene = memo(RouteSceneView)
