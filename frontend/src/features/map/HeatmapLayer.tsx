import { Layer, Source } from '@vis.gl/react-maplibre'
import type { ExpressionSpecification } from 'maplibre-gl'
import { useMemo } from 'react'
import type { Heatmap } from '../../shared/types'
import { circleFillForHour, heatmapFeatures } from './heatmapPaint'
import { HEATMAP_BLUR, HEATMAP_LAYER_ID, HEATMAP_RADIUS_STOPS_ZOOM_PX } from './mapConstants'

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

// Only the circle fill changes with the slider; the source is built once per response (FE-08, FE-09).
export function HeatmapLayer({ heatmap, hourOffset }: HeatmapLayerProps) {
  const features = useMemo(() => heatmapFeatures(heatmap), [heatmap])
  return (
    <Source id="heatmap" type="geojson" data={features}>
      <Layer
        id={HEATMAP_LAYER_ID}
        type="circle"
        paint={{
          'circle-radius': RADIUS_BY_ZOOM,
          'circle-blur': HEATMAP_BLUR,
          'circle-color': circleFillForHour(hourOffset),
        }}
      />
    </Source>
  )
}
