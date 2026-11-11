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

// The free basemap style names an icon its sprite does not contain; drawing nothing for it
// keeps the browser console free of a repeated warning.
export function BlankMissingImages() {
  const { current: map } = useMap()
  useEffect(() => {
    if (!map) {
      return undefined
    }
    const fillIn = (event: { id: string }) => {
      addBlankImageIfMissing(map, event.id)
    }
    map.on('styleimagemissing', fillIn)
    return () => {
      map.off('styleimagemissing', fillIn)
    }
  }, [map])
  return null
}
