import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useMap } from '@vis.gl/react-maplibre'
import type { MapRef } from '@vis.gl/react-maplibre'
import { useCallback, useEffect, useMemo } from 'react'
import { fitPadding } from './fitPadding'
import { FIT_DURATION_MS } from './mapConstants'
import { boundsOfLines } from './routeGeoJson'
import type { RouteLines } from './routeGeoJson'
import { isRouteInsidePadding } from './routeVisibility'
import { ShowWholeTripControl } from './ShowWholeTripControl'
import { useRefitAfterResize } from './useRefitAfterResize'

interface FitToRoutesProps {
  lines: RouteLines
}

export function FitToRoutes({ lines }: FitToRoutesProps) {
  const { current: map } = useMap()
  const bounds = useMemo(() => boundsOfLines(lines), [lines])
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isPanelOverMap = useMediaQuery(useTheme().breakpoints.up('md'))
  const fit = useCallback(
    (eventData?: object) => {
      if (map && bounds) {
        const options = {
          padding: fitPadding(isPanelOverMap),
          duration: prefersReducedMotion ? 0 : FIT_DURATION_MS,
        }
        map.fitBounds(bounds, options, eventData)
      }
    },
    [map, bounds, prefersReducedMotion, isPanelOverMap],
  )
  // Carrying the click as the original event makes the truck follow treat it like a hand move.
  const fitByHand = useCallback(
    (click: Event) => {
      fit({ originalEvent: click })
    },
    [fit],
  )
  const isRouteVisible = useCallback(
    (visibleMap: MapRef) =>
      bounds === null || isRouteInsidePadding(visibleMap, bounds, fitPadding(isPanelOverMap)),
    [bounds, isPanelOverMap],
  )
  useEffect(fit, [fit])
  useRefitAfterResize(map, isRouteVisible, fit)
  return bounds && <ShowWholeTripControl onPress={fitByHand} />
}
