import type { MapRef } from '@vis.gl/react-maplibre'
import { useEffect } from 'react'

// MapLibre resizes in steps while the results panel slides; this waits for the last step.
const RESIZE_SETTLE_MS = 150

function watchResizeHidingRoute(map: MapRef, isRouteVisible: () => boolean, refit: () => void) {
  let wasVisible = isRouteVisible()
  let settleTimer: number | undefined
  const rememberVisibility = () => {
    if (settleTimer === undefined) {
      wasVisible = isRouteVisible()
    }
  }
  const settle = () => {
    settleTimer = undefined
    if (wasVisible && !isRouteVisible()) {
      refit()
    } else {
      wasVisible = isRouteVisible()
    }
  }
  const restartSettling = () => {
    window.clearTimeout(settleTimer)
    settleTimer = window.setTimeout(settle, RESIZE_SETTLE_MS)
  }
  map.on('moveend', rememberVisibility)
  map.on('resize', restartSettling)
  return () => {
    window.clearTimeout(settleTimer)
    map.off('moveend', rememberVisibility)
    map.off('resize', restartSettling)
  }
}

// Fits the route again only when a resize pushed a route that was fully in view under the legend, zoom
// buttons or forecast panel. A map the driver has moved, with the route still clear of them, stays put.
export function useRefitAfterResize(
  map: MapRef | undefined,
  isRouteVisible: (map: MapRef) => boolean,
  refit: () => void,
) {
  useEffect(() => {
    if (!map) {
      return
    }
    return watchResizeHidingRoute(map, () => isRouteVisible(map), refit)
  }, [map, isRouteVisible, refit])
}
