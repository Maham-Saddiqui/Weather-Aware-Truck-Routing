import { lazy } from 'react'

export const RouteResults = lazy(() =>
  import('./RouteResults').then((module) => ({ default: module.RouteResults })),
)
export { useTripResults } from './useTripResults'
export type { TripResults } from './tripResults'
