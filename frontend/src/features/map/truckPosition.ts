import type { Checkpoint } from '../../shared/types'

type LatLon = Checkpoint['position']

export interface TruckPosition {
  position: LatLon
  hasArrived: boolean
}

function between(from: LatLon, to: LatLon, share: number): LatLon {
  return {
    lat: from.lat + (to.lat - from.lat) * share,
    lon: from.lon + (to.lon - from.lon) * share,
  }
}

// Display geometry only: the truck moves in a straight line in time between the ETAs the server sent.
// The first checkpoint is the origin and the last is the destination (RR-19).
export function truckPositionAt(
  checkpoints: readonly Checkpoint[],
  instantMs: number,
): TruckPosition | null {
  const stops = checkpoints.map((checkpoint) => ({
    position: checkpoint.position,
    etaMs: Date.parse(checkpoint.eta_utc),
  }))
  const origin = stops[0]
  const destination = stops.at(-1)
  if (!origin || !destination) {
    return null
  }
  const nextIndex = stops.findIndex((stop) => stop.etaMs > instantMs)
  if (nextIndex === -1) {
    return { position: destination.position, hasArrived: true }
  }
  const next = stops[nextIndex]
  const previous = stops[nextIndex - 1]
  if (!next || !previous) {
    return { position: origin.position, hasArrived: false }
  }
  const share = (instantMs - previous.etaMs) / (next.etaMs - previous.etaMs)
  return { position: between(previous.position, next.position, share), hasArrived: false }
}
