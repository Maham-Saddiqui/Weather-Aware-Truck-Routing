import { useMap } from '@vis.gl/react-maplibre'
import { useCallback, useSyncExternalStore } from 'react'
import type { Checkpoint } from '../../shared/types'
import { meanSpacingPx, strideForSpacing } from './dotThinning'

type LatLon = Checkpoint['position']

// Reports only the stride, a small whole number, so zooming re-renders the dots only when the thinning changes.
export function useDotStride(positions: readonly LatLon[]): number {
  const { current: map } = useMap()
  const subscribe = useCallback(
    (notify: () => void) => {
      map?.on('zoomend', notify)
      return () => {
        map?.off('zoomend', notify)
      }
    },
    [map],
  )
  return useSyncExternalStore(subscribe, () =>
    map
      ? strideForSpacing(meanSpacingPx(positions.map(({ lon, lat }) => map.project([lon, lat]))))
      : 1,
  )
}
