import type { FeatureCollection, Point } from 'geojson'
import type { CheckpointLevel, Route } from '../../shared/types'

export interface UnselectedDotProperties {
  routeId: string
  level: CheckpointLevel
  tier: number
}

export type UnselectedDots = FeatureCollection<Point, UnselectedDotProperties>

// Tier 0 is every 4th checkpoint and the destination, tier 1 the remaining even ones, tier 2 the odd ones.
export function dotTier(position: number, lastPosition: number): number {
  if (position % 4 === 0 || position === lastPosition) {
    return 0
  }
  return position % 2 === 0 ? 1 : 2
}

// The level is the one the server rated; nothing is derived here (GEN-03).
export function unselectedDotFeatures(routes: readonly Route[]): UnselectedDots {
  return {
    type: 'FeatureCollection',
    features: routes.flatMap((route) =>
      route.checkpoints.map(({ position, level }, index) => ({
        type: 'Feature',
        properties: {
          routeId: route.id,
          level,
          tier: dotTier(index, route.checkpoints.length - 1),
        },
        geometry: { type: 'Point', coordinates: [position.lon, position.lat] },
      })),
    ),
  }
}
