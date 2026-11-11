import { useState } from 'react'

// A tile that fails to load leaves the rest of the map usable, so only an error from the map itself
// (it could not start, or its style could not be read: no tile or source involved) counts as a failure.
function isTileOrSourceError(event: object): boolean {
  return 'sourceId' in event || 'tile' in event
}

export function useMapFailure() {
  const [hasLoaded, setHasLoaded] = useState(false)
  const [hasFailed, setHasFailed] = useState(false)
  return {
    hasFailed,
    markLoaded: () => {
      setHasLoaded(true)
    },
    report: (event: object) => {
      if (!hasLoaded && !isTileOrSourceError(event)) setHasFailed(true)
    },
  }
}
