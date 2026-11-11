import { arrivalEtaUtc } from '../shared/arrival'
import { hoursBetween } from '../shared/time'
import type { Heatmap, Route } from '../shared/types'

// Play runs from departure to the first whole hour at or after the truck's arrival, never past the slider's last hour.
export function playUntilHour(route: Route, heatmap: Heatmap): number {
  const lastHour = heatmap.hours - 1
  const arrival = arrivalEtaUtc(route)
  if (!arrival) {
    return lastHour
  }
  const arrivalHour = Math.max(0, Math.ceil(hoursBetween(heatmap.start_utc, arrival)))
  return Math.min(arrivalHour, lastHour)
}
