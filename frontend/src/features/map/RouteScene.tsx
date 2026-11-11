import { memo, useMemo } from 'react'
import type { Route } from '../../shared/types'
import { FitToRoutes } from './FitToRoutes'
import { RouteLayers } from './RouteLayers'
import { RoutePills } from './RoutePills'
import { routeLines } from './routeGeoJson'

export interface RouteSceneProps {
  routes: readonly Route[]
  selectedRouteId: string | null
  onSelectRoute: (routeId: string) => void
}

// Memoised so a slider tick (which only changes the hour) never redraws the route lines (FE-08).
function RouteSceneView({ routes, selectedRouteId, onSelectRoute }: RouteSceneProps) {
  const lines = useMemo(() => routeLines(routes), [routes])
  return (
    <>
      <FitToRoutes lines={lines} />
      <RouteLayers lines={lines} selectedRouteId={selectedRouteId} />
      <RoutePills
        routes={routes}
        lines={lines}
        selectedRouteId={selectedRouteId}
        onSelectRoute={onSelectRoute}
      />
    </>
  )
}

export const RouteScene = memo(RouteSceneView)
