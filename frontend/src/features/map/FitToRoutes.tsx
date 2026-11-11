import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useMap } from '@vis.gl/react-maplibre'
import { useEffect, useMemo } from 'react'
import { fitPadding } from './fitPadding'
import { FIT_DURATION_MS } from './mapConstants'
import { boundsOfLines } from './routeGeoJson'
import type { RouteLines } from './routeGeoJson'

interface FitToRoutesProps {
  lines: RouteLines
}

export function FitToRoutes({ lines }: FitToRoutesProps) {
  const { current: map } = useMap()
  const bounds = useMemo(() => boundsOfLines(lines), [lines])
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isPanelOverMap = useMediaQuery(useTheme().breakpoints.up('md'))
  useEffect(() => {
    if (map && bounds) {
      map.fitBounds(bounds, {
        padding: fitPadding(isPanelOverMap),
        duration: prefersReducedMotion ? 0 : FIT_DURATION_MS,
      })
    }
  }, [map, bounds, prefersReducedMotion, isPanelOverMap])
  return null
}
