import useMediaQuery from '@mui/material/useMediaQuery'
import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { Checkpoint } from '../../shared/types'
import { TRUCK_TWEEN_MAX_MS } from './mapConstants'

type LatLon = Checkpoint['position']

export interface MovableMarker {
  getLngLat: () => { lng: number; lat: number }
  setLngLat: (position: [number, number]) => unknown
}

function between(from: LatLon, to: LatLon, share: number): LatLon {
  return {
    lat: from.lat + (to.lat - from.lat) * share,
    lon: from.lon + (to.lon - from.lon) * share,
  }
}

function place(
  markerRef: RefObject<MovableMarker | null>,
  shown: RefObject<LatLon>,
  position: LatLon,
) {
  shown.current = position
  markerRef.current?.setLngLat([position.lon, position.lat])
}

// Glides the marker to its new position through the map's marker API, one animation frame at a time, so React
// redraws nothing per frame (FE-08). The glide lasts as long as the pause since the previous move, at most
// TRUCK_TWEEN_MAX_MS: during playback it flows from one step into the next, and a dragged slider is followed at once.
export function useTweenedMarker(markerRef: RefObject<MovableMarker | null>, target: LatLon) {
  const { lat, lon } = target
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const shown = useRef(target)
  const lastMoveAt = useRef<number | null>(null)

  // The marker component moves the marker to the new target while rendering; undo that before the screen is drawn.
  useLayoutEffect(() => {
    place(markerRef, shown, shown.current)
  })

  useLayoutEffect(() => {
    const goal = { lat, lon }
    const from = shown.current
    const startedAt = performance.now()
    const pause = lastMoveAt.current === null ? 0 : startedAt - lastMoveAt.current
    const duration = Math.min(pause, TRUCK_TWEEN_MAX_MS)
    lastMoveAt.current = startedAt
    if (prefersReducedMotion || duration <= 0) {
      place(markerRef, shown, goal)
      return undefined
    }
    let frameId = 0
    const step = (now: number) => {
      const share = Math.min((now - startedAt) / duration, 1)
      place(markerRef, shown, between(from, goal, share))
      if (share < 1) {
        frameId = requestAnimationFrame(step)
      }
    }
    frameId = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [markerRef, lat, lon, prefersReducedMotion])
}
