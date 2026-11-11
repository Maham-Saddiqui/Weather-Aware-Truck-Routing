import type { MapRef } from '@vis.gl/react-maplibre'
import { useCallback, useEffect, useRef } from 'react'

// MapLibre resizes in steps while the results panel slides; this waits for the last step.
const RESIZE_SETTLE_MS = 150

interface RefitRules {
  isRouteVisible: () => boolean
  isFramedByFit: () => boolean
  refit: () => void
}

function watchResizeReframing(map: MapRef, rules: RefitRules) {
  let wasVisible = rules.isRouteVisible()
  let width = map.getContainer().clientWidth
  let settleTimer: number | undefined
  const rememberVisibility = () => {
    if (settleTimer === undefined) {
      wasVisible = rules.isRouteVisible()
    }
  }
  const settle = () => {
    settleTimer = undefined
    const hasWidthChanged = map.getContainer().clientWidth !== width
    width = map.getContainer().clientWidth
    if ((wasVisible && !rules.isRouteVisible()) || (hasWidthChanged && rules.isFramedByFit())) {
      rules.refit()
    } else {
      wasVisible = rules.isRouteVisible()
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

// Fits the route again after the map got wider or narrower (the results panel hiding or showing) when the
// view is still the one a fit chose, and when a resize pushed a route that was fully in view under the
// legend, zoom buttons or forecast panel. A map the driver moved, with the route still clear of them, stays put.
export function useRefitAfterResize(
  map: MapRef | undefined,
  isRouteVisible: (map: MapRef) => boolean,
  isFramedByFit: () => boolean,
  refit: () => void,
) {
  useEffect(() => {
    if (!map) {
      return
    }
    return watchResizeReframing(map, {
      isRouteVisible: () => isRouteVisible(map),
      isFramedByFit,
      refit,
    })
  }, [map, isRouteVisible, isFramedByFit, refit])
}

// The view stays the one a fit chose until anything else moves the map: the driver's hands, or the truck
// follow easing it. A move that a fit starts is the fit's own, even when the button's click is attached.
export function useFramingByFit(map: MapRef | undefined) {
  const state = useRef({ isFramed: false, isFitting: false })
  useEffect(() => {
    const dropOnOtherMove = () => {
      if (!state.current.isFitting) {
        state.current.isFramed = false
      }
    }
    map?.on('movestart', dropOnOtherMove)
    return () => {
      map?.off('movestart', dropOnOtherMove)
    }
  }, [map])
  const fitAndFrame = useCallback((fit: () => void) => {
    state.current.isFitting = true
    fit()
    state.current = { isFramed: true, isFitting: false }
  }, [])
  const isFramedByFit = useCallback(() => state.current.isFramed, [])
  return { fitAndFrame, isFramedByFit }
}
