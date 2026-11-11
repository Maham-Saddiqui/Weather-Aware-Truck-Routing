import { Layer, Source } from '@vis.gl/react-maplibre'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { ExpressionSpecification } from 'maplibre-gl'
import { useMemo } from 'react'
import type { Heatmap } from '../../shared/types'
import { circleFillForHour, heatmapFeatures } from './heatmapPaint'
import {
  HEATMAP_BLUR,
  HEATMAP_FADE_MS,
  HEATMAP_LAYER_ID,
  HEATMAP_RADIUS_STOPS_ZOOM_PX,
} from './mapConstants'
import { useCrossfadingHours } from './useCrossfadingHours'

interface HeatmapLayerProps {
  heatmap: Heatmap
  hourOffset: number
}

const RADIUS_BY_ZOOM: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  ...HEATMAP_RADIUS_STOPS_ZOOM_PX,
]

const LAYER_IDS = [HEATMAP_LAYER_ID, `${HEATMAP_LAYER_ID}-next`] as const

// Only paint properties change with the slider; the source is built once per response (FE-08, FE-09).
export function HeatmapLayer({ heatmap, hourOffset }: HeatmapLayerProps) {
  const features = useMemo(() => heatmapFeatures(heatmap), [heatmap])
  const { hourOfLayer, frontLayer } = useCrossfadingHours(hourOffset)
  const fadeMs = useMediaQuery('(prefers-reduced-motion: reduce)') ? 0 : HEATMAP_FADE_MS
  return (
    <Source id="heatmap" type="geojson" data={features}>
      {LAYER_IDS.map((id, layer) => (
        <Layer
          key={id}
          id={id}
          type="circle"
          paint={{
            'circle-radius': RADIUS_BY_ZOOM,
            'circle-blur': HEATMAP_BLUR,
            'circle-color': circleFillForHour(hourOfLayer[layer] ?? hourOffset),
            'circle-opacity': layer === frontLayer ? 1 : 0,
            'circle-opacity-transition': { duration: fadeMs },
          }}
        />
      ))}
    </Source>
  )
}
