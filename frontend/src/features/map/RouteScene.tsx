import { memo, useMemo } from 'react'
import type { Route } from '../../shared/types'
import { FitToRoutes } from './FitToRoutes'
import { RouteLayers } from './RouteLayers'
import { routeLines } from './routeGeoJson'

export interface RouteSceneProps {
  routes: readonly Route[]
  selectedRouteId: string | null
}

// Memoised so a slider tick (which only changes the hour) never redraws the route lines (FE-08).
function RouteSceneView({ routes, selectedRouteId }: RouteSceneProps) {
  const lines = useMemo(() => routeLines(routes), [routes])
  return (
    <>
      <FitToRoutes lines={lines} />
      <RouteLayers lines={lines} selectedRouteId={selectedRouteId} />
    </>
  )
}

export const RouteScene = memo(RouteSceneView)
