import { Layer, Source } from '@vis.gl/react-maplibre'
import { useTheme } from '@mui/material/styles'
import { ROUTE_CASING_COLOUR } from '../../shared/colours'
import { ROUTE_HIT_LAYER_ID, ROUTE_HIT_WIDTH_PX, ROUTE_LINE_LAYER_ID } from './mapConstants'
import type { RouteLines } from './routeGeoJson'
import {
  casingPaint,
  HALO_OPACITY,
  HALO_WIDTH_PX,
  linePaint,
  selectedOnTop,
  selectedRouteFilter,
} from './routePaint'
import { useDirectionArrow } from './useDirectionArrow'

interface RouteLayersProps {
  lines: RouteLines
  selectedRouteId: string | null
}

const ROUND_LINES = { 'line-cap': 'round', 'line-join': 'round' } as const

const HIT_PAINT = {
  'line-color': ROUTE_CASING_COLOUR,
  'line-opacity': 0,
  'line-width': ROUTE_HIT_WIDTH_PX,
} as const

// Every route keeps its own hue; the selected one is told apart by width and a halo, never by changing colour.
// The layers must stay direct children of the source, which hands them its id.
export function RouteLayers({ lines, selectedRouteId }: RouteLayersProps) {
  const { palette } = useTheme()
  const arrowLayer = useDirectionArrow(selectedRouteId)
  const sortKey = { ...ROUND_LINES, ...selectedOnTop(selectedRouteId) }
  return (
    <Source id="routes" type="geojson" data={lines}>
      <Layer
        id="route-halo"
        type="line"
        filter={selectedRouteFilter(selectedRouteId)}
        layout={ROUND_LINES}
        paint={{
          'line-color': palette.common.white,
          'line-opacity': HALO_OPACITY,
          'line-width': HALO_WIDTH_PX,
        }}
      />
      <Layer id="route-casing" type="line" layout={sortKey} paint={casingPaint(selectedRouteId)} />
      <Layer
        id={ROUTE_LINE_LAYER_ID}
        type="line"
        layout={sortKey}
        paint={linePaint(selectedRouteId, palette.route)}
      />
      {arrowLayer && <Layer {...arrowLayer} />}
      <Layer id={ROUTE_HIT_LAYER_ID} type="line" layout={ROUND_LINES} paint={HIT_PAINT} />
    </Source>
  )
}
