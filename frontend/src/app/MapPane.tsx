import Skeleton from '@mui/material/Skeleton'
import { lazy, Suspense } from 'react'
import type { RouteMapProps } from '../shared/types'
import { ErrorBoundary } from './ErrorBoundary'

const RouteMap = lazy(() =>
  import('../features/map').then((module) => ({ default: module.RouteMap })),
)

export function MapPane(props: RouteMapProps) {
  return (
    <ErrorBoundary area="the map">
      <Suspense fallback={<Skeleton variant="rectangular" height="100%" />}>
        <RouteMap {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}
