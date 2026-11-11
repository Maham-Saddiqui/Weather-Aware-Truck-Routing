import useMediaQuery from '@mui/material/useMediaQuery'
import { useMap } from '@vis.gl/react-maplibre'
import { useEffect, useMemo } from 'react'
import { FIT_DURATION_MS, FIT_PADDING_PX } from './mapConstants'
import { boundsOfLines } from './routeGeoJson'
import type { RouteLines } from './routeGeoJson'

interface FitToRoutesProps {
  lines: RouteLines
}

export function FitToRoutes({ lines }: FitToRoutesProps) {
  const { current: map } = useMap()
  const bounds = useMemo(() => boundsOfLines(lines), [lines])
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  useEffect(() => {
    if (map && bounds) {
      map.fitBounds(bounds, {
        padding: FIT_PADDING_PX,
        duration: prefersReducedMotion ? 0 : FIT_DURATION_MS,
      })
    }
  }, [map, bounds, prefersReducedMotion])
  return null
}
