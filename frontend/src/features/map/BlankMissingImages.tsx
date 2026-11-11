import { useMap } from '@vis.gl/react-maplibre'
import { useEffect } from 'react'

const TRANSPARENT_PIXEL = { width: 1, height: 1, data: new Uint8Array(4) }

interface ImageHolder {
  hasImage: (id: string) => boolean
  addImage: (id: string, image: typeof TRANSPARENT_PIXEL) => void
}

export function addBlankImageIfMissing(map: ImageHolder, id: string) {
  if (!map.hasImage(id)) {
    map.addImage(id, TRANSPARENT_PIXEL)
  }
}

// The free basemap style names an icon its sprite does not contain; drawing nothing for it keeps the
// browser console free of a repeated warning. This MapLibre version only lets a resolver, not the
// styleimagemissing event, supply the image in time.
export function BlankMissingImages() {
  const { current: map } = useMap()
  useEffect(() => {
    if (!map) {
      return undefined
    }
    map.setMissingStyleImageResolver((id) => {
      addBlankImageIfMissing(map, id)
    })
    return () => {
      map.setMissingStyleImageResolver(null)
    }
  }, [map])
  return null
}
