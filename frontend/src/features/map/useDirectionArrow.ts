import { decomposeColor, useTheme } from '@mui/material/styles'
import { useMap } from '@vis.gl/react-maplibre'
import { useCallback, useSyncExternalStore } from 'react'
import { ROUTE_CASING_COLOUR } from '../../shared/colours'
import { ARROW_IMAGE_ID, ARROW_IMAGE_PIXEL_RATIO, arrowImageData } from './directionArrowImage'
import type { Rgb } from './directionArrowImage'
import { arrowSpacingPx, directionCueLayerProps } from './directionCue'

function rgbOf(colour: string): Rgb {
  const [red = 0, green = 0, blue = 0] = decomposeColor(colour).values
  return [red, green, blue]
}

// Registers the arrow with the map before the layer that draws it exists, so the map never asks for it too early
// and the blank-image fallback for missing basemap icons never takes its place. Gives that layer, spaced for the
// map's current width, once the image is there, and null until then. The image stays with the map, which may already
// be gone when this scene is torn down. Only a resize changes it, never a zoom or a frame.
export function useDirectionArrow(selectedRouteId: string | null) {
  const { current: map } = useMap()
  const white = useTheme().palette.common.white
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!map) {
        return () => undefined
      }
      if (!map.hasImage(ARROW_IMAGE_ID)) {
        map.addImage(ARROW_IMAGE_ID, arrowImageData(rgbOf(white), rgbOf(ROUTE_CASING_COLOUR)), {
          pixelRatio: ARROW_IMAGE_PIXEL_RATIO,
        })
      }
      map.on('resize', notify)
      notify()
      return () => {
        map.off('resize', notify)
      }
    },
    [map, white],
  )
  const spacing = useSyncExternalStore(subscribe, () =>
    map?.hasImage(ARROW_IMAGE_ID) ? arrowSpacingPx(map.getContainer().clientWidth) : 0,
  )
  return spacing > 0 ? directionCueLayerProps(selectedRouteId, spacing) : null
}
