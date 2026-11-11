import type { ExpressionSpecification } from 'maplibre-gl'
import { ARROW_IMAGE_ID } from './directionArrowImage'

const DIRECTION_CUE_LAYER_ID = 'route-direction'

// Sideways from the line, so the checkpoint dots that sit on it never cover the arrows.
const ARROW_OFFSET_PX: [number, number] = [0, -22]
const ARROW_OPACITY = 0.85

const ARROWS_ACROSS_THE_MAP = 10
const MIN_SPACING_PX = 40
const MAX_SPACING_PX = 150

// A fitted route is about three quarters as long as the map is wide, and the map drops an arrow where a stretch of
// line is too short to hold one, so a gap of a tenth of the width leaves 5 to 8 arrows along it at every zoom:
// zooming moves the route under the arrows, not the arrows apart. A floor keeps a phone map from being crowded and
// a ceiling keeps a very wide map from being bare.
export function arrowSpacingPx(mapWidthPx: number): number {
  return Math.round(
    Math.min(MAX_SPACING_PX, Math.max(MIN_SPACING_PX, mapWidthPx / ARROWS_ACROSS_THE_MAP)),
  )
}

function directionCueFilter(selectedRouteId: string | null): ExpressionSpecification {
  return ['==', ['get', 'routeId'], selectedRouteId ?? '']
}

// Arrows must never hide or push aside anything else, nor be dropped because a basemap label or a dot icon is in the
// way, and an arrow that would be turned upside down by a westward line keeps pointing the way the truck drives.
const DIRECTION_CUE_LAYOUT = {
  'symbol-placement': 'line',
  'icon-image': ARROW_IMAGE_ID,
  'icon-offset': ARROW_OFFSET_PX,
  'icon-rotation-alignment': 'map',
  'icon-keep-upright': false,
  'icon-allow-overlap': true,
  'icon-ignore-placement': true,
} as const

// Spread onto a Layer that is a direct child of the routes source.
export function directionCueLayerProps(selectedRouteId: string | null, spacingPx: number) {
  return {
    id: DIRECTION_CUE_LAYER_ID,
    type: 'symbol',
    filter: directionCueFilter(selectedRouteId),
    layout: { ...DIRECTION_CUE_LAYOUT, 'symbol-spacing': spacingPx },
    paint: { 'icon-opacity': ARROW_OPACITY },
  } as const
}
