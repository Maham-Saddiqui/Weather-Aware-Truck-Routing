import Box from '@mui/material/Box'
import { AttributionControl, Map, NavigationControl } from '@vis.gl/react-maplibre'
import type { MapLayerMouseEvent } from '@vis.gl/react-maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useState } from 'react'
import { MAP_MIN_HEIGHT_PX } from '../../shared/constants'
import type { RouteMapProps } from '../../shared/types'
import { BlankMissingImages } from './BlankMissingImages'
import type { EndpointLabels } from './EndpointMarkers'
import { HeatmapLayer } from './HeatmapLayer'
import {
  BASEMAP_STYLE_URL,
  INITIAL_VIEW,
  ROUTE_HIT_LAYER_ID,
  UNSELECTED_DOT_LAYER_IDS,
} from './mapConstants'
import { mapLib } from './mapLib'
import { MapLegend } from './MapLegend'
import { MapUnavailable } from './MapUnavailable'
import { useMapFailure } from './useMapFailure'
import { ReadableLabels } from './ReadableLabels'
import { RouteMarkers } from './RouteMarkers'
import { RouteScene } from './RouteScene'

// The map's width is a container size, so children (the route name pills) can drop out when it is very small.
const FRAME_STYLE = {
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: MAP_MIN_HEIGHT_PX,
  containerType: 'inline-size',
} as const

const INTERACTIVE_LAYER_IDS = [ROUTE_HIT_LAYER_ID, ...UNSELECTED_DOT_LAYER_IDS]

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

interface RouteMapCanvasProps extends RouteMapProps {
  endpointLabels?: EndpointLabels
}

function useRouteClicks(onSelectRoute: (routeId: string) => void) {
  const [isOverRoute, setIsOverRoute] = useState(false)
  return {
    cursor: isOverRoute ? 'pointer' : undefined,
    onMouseEnter: () => {
      setIsOverRoute(true)
    },
    onMouseLeave: () => {
      setIsOverRoute(false)
    },
    onClick: (event: MapLayerMouseEvent) => {
      const routeId = clickedRouteId(event)
      if (routeId !== null) {
        onSelectRoute(routeId)
      }
    },
  }
}

function MapContents({
  heatmap,
  hourOffset,
  showTruckRequest,
  onSelectRoute,
  endpointLabels,
  ...scene
}: RouteMapCanvasProps) {
  return (
    <>
      <AttributionControl position="bottom-right" compact={false} />
      <NavigationControl position="top-right" showCompass={false} />
      <BlankMissingImages />
      <ReadableLabels />
      {heatmap && <HeatmapLayer heatmap={heatmap} hourOffset={hourOffset} />}
      <RouteScene {...scene} onSelectRoute={onSelectRoute} />
      <RouteMarkers
        {...scene}
        heatmap={heatmap}
        hourOffset={hourOffset}
        showTruckRequest={showTruckRequest}
        endpointLabels={endpointLabels}
      />
    </>
  )
}

export function RouteMapCanvas(props: RouteMapCanvasProps) {
  const failure = useMapFailure()
  const routeClicks = useRouteClicks(props.onSelectRoute)
  return (
    <Box sx={FRAME_STYLE}>
      {' '}
      <Map
        mapLib={mapLib}
        mapStyle={BASEMAP_STYLE_URL}
        initialViewState={INITIAL_VIEW}
        attributionControl={false}
        interactiveLayerIds={INTERACTIVE_LAYER_IDS}
        {...routeClicks}
        onLoad={failure.markLoaded}
        onError={failure.report}
      >
        <MapContents {...props} />
      </Map>
      <MapLegend />
      {failure.hasFailed && <MapUnavailable />}
    </Box>
  )
}
