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
import { useRefitAfterResize } from './useRefitAfterResize'

interface FitToRoutesProps {
  lines: RouteLines
}

export function FitToRoutes({ lines }: FitToRoutesProps) {
  const { current: map } = useMap()
  const bounds = useMemo(() => boundsOfLines(lines), [lines])
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isPanelOverMap = useMediaQuery(useTheme().breakpoints.up('md'))
  const fit = useCallback(() => {
    if (map && bounds) {
      map.fitBounds(bounds, {
        padding: fitPadding(isPanelOverMap),
        duration: prefersReducedMotion ? 0 : FIT_DURATION_MS,
      })
    }
  }, [map, bounds, prefersReducedMotion, isPanelOverMap])
  const isRouteVisible = useCallback(
    (visibleMap: MapRef) =>
      bounds === null || isRouteInsidePadding(visibleMap, bounds, fitPadding(isPanelOverMap)),
    [bounds, isPanelOverMap],
  )
  useEffect(fit, [fit])
  useRefitAfterResize(map, isRouteVisible, fit)
  return null
}
