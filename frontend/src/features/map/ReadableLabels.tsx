import { useMap } from '@vis.gl/react-maplibre'
import { useEffect } from 'react'
import { LABEL_HALO_COLOUR, LABEL_HALO_WIDTH_PX, LABEL_TEXT_COLOUR } from './mapConstants'

interface StyleLayer {
  id: string
  type: string
  layout?: Record<string, unknown>
}

export interface LabelledMap {
  getStyle: () => { layers?: StyleLayer[] } | undefined
  setPaintProperty(layerId: string, name: 'text-color' | 'text-halo-color', value: string): unknown
  setPaintProperty(layerId: string, name: 'text-halo-width', value: number): unknown
}

function isLabelLayer(layer: StyleLayer): boolean {
  return layer.type === 'symbol' && layer.layout?.['text-field'] !== undefined
}

// Only layers the loaded style really has are touched, so a different or trimmed style cannot break this.
export function brightenLabels(map: LabelledMap) {
  for (const layer of map.getStyle()?.layers?.filter(isLabelLayer) ?? []) {
    map.setPaintProperty(layer.id, 'text-color', LABEL_TEXT_COLOUR)
    map.setPaintProperty(layer.id, 'text-halo-color', LABEL_HALO_COLOUR)
    map.setPaintProperty(layer.id, 'text-halo-width', LABEL_HALO_WIDTH_PX)
  }
}

// The free dark basemap draws place names in a mid grey that is hard to read on near-black; this lifts the
// text and thickens its halo once the style has loaded, without changing the provider or its credits.
export function ReadableLabels() {
  const { current: map } = useMap()
  useEffect(() => {
    if (!map) {
      return undefined
    }
    const apply = () => {
      brightenLabels(map.getMap())
    }
    if (map.isStyleLoaded()) {
      apply()
    }
    map.on('style.load', apply)
    return () => {
      map.off('style.load', apply)
    }
  }, [map])
  return null
}
