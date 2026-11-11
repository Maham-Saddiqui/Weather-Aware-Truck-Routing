import type { ExpressionSpecification } from 'maplibre-gl'

const DIRECTION_CUE_LAYER_ID = 'route-direction'

// A plain angle bracket (the basemap's glyph set has no finer arrow) that the map turns to follow the line, so it always points from A to B.
const ARROW_GLYPH = '>'
// The only font the free basemap serves glyphs for.
const ARROW_FONT = ['Noto Sans Regular']
const ARROW_SIZE_PX = 28
// Sideways from the line, so the checkpoint dots that sit on it never cover the arrows.
const ARROW_OFFSET_EM: [number, number] = [0, -0.75]
const ARROW_OPACITY = 0.75
// Pixels between arrows on screen: closer when zoomed out would crowd a long route, so the gap grows with zoom.
const SPACING_BY_ZOOM: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  4,
  70,
  10,
  140,
]

function directionCueFilter(selectedRouteId: string | null): ExpressionSpecification {
  return ['==', ['get', 'routeId'], selectedRouteId ?? '']
}

// Arrows draw over their own route's line but must never hide or push aside anything else, nor be pushed aside by map labels,
// and an arrow that would be turned upside down by a westward line keeps pointing the way the truck drives.
const DIRECTION_CUE_LAYOUT = {
  'symbol-placement': 'line',
  'symbol-spacing': SPACING_BY_ZOOM,
  'text-field': ARROW_GLYPH,
  'text-font': ARROW_FONT,
  'text-size': ARROW_SIZE_PX,
  'text-offset': ARROW_OFFSET_EM,
  'text-keep-upright': false,
  'text-allow-overlap': true,
  'text-ignore-placement': true,
} as const

// Spread onto a Layer that is a direct child of the routes source.
export function directionCueLayerProps(selectedRouteId: string | null, colour: string) {
  return {
    id: DIRECTION_CUE_LAYER_ID,
    type: 'symbol',
    filter: directionCueFilter(selectedRouteId),
    layout: DIRECTION_CUE_LAYOUT,
    paint: { 'text-color': colour, 'text-opacity': ARROW_OPACITY },
  } as const
}
