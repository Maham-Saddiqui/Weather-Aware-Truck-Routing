import Box from '@mui/material/Box'
import { AttributionControl, Map, NavigationControl } from '@vis.gl/react-maplibre'
import type { MapLayerMouseEvent } from '@vis.gl/react-maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useState } from 'react'
import { MAP_MIN_HEIGHT_PX } from '../../shared/constants'
import type { RouteMapProps } from '../../shared/types'
import { BlankMissingImages } from './BlankMissingImages'
import { HeatmapLayer } from './HeatmapLayer'
import { BASEMAP_STYLE_URL, INITIAL_VIEW, ROUTE_HIT_LAYER_ID } from './mapConstants'
import { mapLib } from './mapLib'
import { MapLegend } from './MapLegend'
import { MapUnavailable } from './MapUnavailable'
import { useMapFailure } from './useMapFailure'
import { RouteMarkers } from './RouteMarkers'
import { RouteScene } from './RouteScene'

const INTERACTIVE_LAYER_IDS = [ROUTE_HIT_LAYER_ID]

function isClickOnMarker(event: MapLayerMouseEvent): boolean {
  const target = event.originalEvent.target
  return target instanceof Element && target.closest('.maplibregl-marker') !== null
}

function clickedRouteId(event: MapLayerMouseEvent): string | null {
  if (isClickOnMarker(event)) {
    return null
  }
  const routeId: unknown = event.features?.[0]?.properties.routeId
  return typeof routeId === 'string' ? routeId : null
}

export function RouteMapCanvas({ heatmap, hourOffset, onSelectRoute, ...scene }: RouteMapProps) {
  const failure = useMapFailure()
  const [isOverRoute, setIsOverRoute] = useState(false)
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', minHeight: MAP_MIN_HEIGHT_PX }}>
      <Map
        mapLib={mapLib}
        mapStyle={BASEMAP_STYLE_URL}
        initialViewState={INITIAL_VIEW}
        attributionControl={false}
        interactiveLayerIds={INTERACTIVE_LAYER_IDS}
        cursor={isOverRoute ? 'pointer' : undefined}
        onMouseEnter={() => {
          setIsOverRoute(true)
        }}
        onMouseLeave={() => {
          setIsOverRoute(false)
        }}
        onClick={(event) => {
          const routeId = clickedRouteId(event)
          if (routeId !== null) {
            onSelectRoute(routeId)
          }
        }}
        onLoad={failure.markLoaded}
        onError={failure.report}
      >
        <AttributionControl position="bottom-right" compact={false} />
        <NavigationControl position="top-right" showCompass={false} />
        <BlankMissingImages />
        {heatmap && <HeatmapLayer heatmap={heatmap} hourOffset={hourOffset} />}
        <RouteScene {...scene} />
        <RouteMarkers {...scene} heatmap={heatmap} hourOffset={hourOffset} />
      </Map>
      <MapLegend />
      {failure.hasFailed && <MapUnavailable />}
    </Box>
  )
}
