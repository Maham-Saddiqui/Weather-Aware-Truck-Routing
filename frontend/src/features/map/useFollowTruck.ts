import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useMap } from '@vis.gl/react-maplibre'
import type { MapRef } from '@vis.gl/react-maplibre'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Checkpoint } from '../../shared/types'
import { FOLLOW_EASE_MS } from './mapConstants'
import { isInsideSafeArea, safeAreaCentreOffset, safeMargins } from './safeArea'

type LatLon = Checkpoint['position']

export interface FollowTruck {
  isTruckHidden: boolean
  showTruck: () => void
}

function isInView(map: MapRef, truck: LatLon, isPanelOverMap: boolean): boolean {
  const container = map.getContainer()
  const size = { width: container.clientWidth, height: container.clientHeight }
  return isInsideSafeArea(map.project([truck.lon, truck.lat]), size, safeMargins(isPanelOverMap))
}

// The map's own easing carries no original event; only the driver's hands do.
function usePausedByDriver(map: MapRef | undefined, route: object) {
  const [isPaused, setIsPaused] = useState(false)
  const [pausedRoute, setPausedRoute] = useState(route)
  if (pausedRoute !== route) {
    setPausedRoute(route)
    setIsPaused(false)
  }
  useEffect(() => {
    const pauseOnHandMove = (event: { originalEvent?: unknown }) => {
      if (event.originalEvent !== undefined) {
        setIsPaused(true)
      }
    }
    map?.on('movestart', pauseOnHandMove)
    return () => {
      map?.off('movestart', pauseOnHandMove)
    }
  }, [map])
  const resume = useCallback(() => {
    setIsPaused(false)
  }, [])
  return { isPaused, resume }
}

function useIsTruckInView(map: MapRef | undefined, truck: LatLon | null, isPanelOverMap: boolean) {
  const subscribe = useCallback(
    (notify: () => void) => {
      map?.on('move', notify)
      return () => {
        map?.off('move', notify)
      }
    },
    [map],
  )
  return useSyncExternalStore(subscribe, () =>
    map && truck ? isInView(map, truck, isPanelOverMap) : true,
  )
}

// Works through the map's own API and events, so a forecast hour never redraws the route lines (FE-08).
// Easing keeps the zoom the driver chose. A hand move stops the following until showTruck or a new route.
export function useFollowTruck(truck: LatLon | null, route: object): FollowTruck {
  const { current: map } = useMap()
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isPanelOverMap = useMediaQuery(useTheme().breakpoints.up('md'))
  const { isPaused, resume } = usePausedByDriver(map, route)
  const isVisible = useIsTruckInView(map, truck, isPanelOverMap)
  const lastRoute = useRef(route)
  const longitude = truck?.lon
  const latitude = truck?.lat

  useEffect(() => {
    const isNewRoute = lastRoute.current !== route
    lastRoute.current = route
    if (!map || longitude === undefined || latitude === undefined) {
      return
    }
    if (isNewRoute || isPaused || isVisible) {
      return
    }
    map.easeTo({
      center: [longitude, latitude],
      offset: safeAreaCentreOffset(safeMargins(isPanelOverMap)),
      duration: prefersReducedMotion ? 0 : FOLLOW_EASE_MS,
    })
  }, [map, longitude, latitude, route, isPaused, isVisible, isPanelOverMap, prefersReducedMotion])

  return { isTruckHidden: isPaused && !isVisible, showTruck: resume }
}
