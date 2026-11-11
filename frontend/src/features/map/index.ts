import { lazy } from 'react'

// The map library is large, so the form and results show first and this chunk loads afterwards (FE-08, FE-11).
export const RouteMap = lazy(() =>
  import('./RouteMapCanvas').then((module) => ({ default: module.RouteMapCanvas })),
)
export { MapUnavailable } from './MapUnavailable'
