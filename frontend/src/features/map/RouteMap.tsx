import Skeleton from '@mui/material/Skeleton'
import { Component, lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { MAP_MIN_HEIGHT_PX } from '../../shared/constants'
import type { RouteMapProps } from '../../shared/types'
import { MapUnavailable } from './MapUnavailable'

// The map library is large, so the form and results show first and this chunk loads afterwards (FE-08, FE-11).
const LazyRouteMapCanvas = lazy(() =>
  import('./RouteMapCanvas').then((module) => ({ default: module.RouteMapCanvas })),
)

class MapLoadBoundary extends Component<{ children: ReactNode }, { hasFailed: boolean }> {
  override state = { hasFailed: false }

  static getDerivedStateFromError() {
    return { hasFailed: true }
  }

  override render() {
    return this.state.hasFailed ? <MapUnavailable /> : this.props.children
  }
}

export function RouteMap(props: RouteMapProps) {
  return (
    <MapLoadBoundary>
      <Suspense
        fallback={
          <Skeleton variant="rounded" height="100%" sx={{ minHeight: MAP_MIN_HEIGHT_PX }} />
        }
      >
        <LazyRouteMapCanvas {...props} />
      </Suspense>
    </MapLoadBoundary>
  )
}
