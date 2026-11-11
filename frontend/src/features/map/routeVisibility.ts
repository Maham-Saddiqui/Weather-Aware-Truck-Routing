import type { MapRef } from '@vis.gl/react-maplibre'
import type { Bounds } from './routeGeoJson'
import { isInsideSafeArea } from './safeArea'
import type { Margins } from './safeArea'

// A route fitted to the padding touches its edge; this keeps rounding from calling it hidden.
const EDGE_TOLERANCE_PX = 2

function looser(padding: Margins): Margins {
  return {
    top: padding.top - EDGE_TOLERANCE_PX,
    right: padding.right - EDGE_TOLERANCE_PX,
    bottom: padding.bottom - EDGE_TOLERANCE_PX,
    left: padding.left - EDGE_TOLERANCE_PX,
  }
}

export function isRouteInsidePadding(map: MapRef, bounds: Bounds, padding: Margins): boolean {
  const [[west, south], [east, north]] = bounds
  const container = map.getContainer()
  const size = { width: container.clientWidth, height: container.clientHeight }
  const corners: [number, number][] = [
    [west, south],
    [west, north],
    [east, south],
    [east, north],
  ]
  return corners.every((corner) => isInsideSafeArea(map.project(corner), size, looser(padding)))
}
