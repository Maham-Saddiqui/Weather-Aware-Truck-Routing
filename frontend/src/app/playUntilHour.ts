import { arrivalEtaUtc } from '../shared/arrival'
import { hoursBetween } from '../shared/time'
import type { Heatmap, Route } from '../shared/types'

// Play runs from departure to one hour after the truck arrives, never past the slider's last hour.
export function playUntilHour(route: Route, heatmap: Heatmap): number {
  const lastHour = heatmap.hours - 1
  const arrival = arrivalEtaUtc(route)
  if (!arrival) {
    return lastHour
  }
  const arrivalHour = Math.max(0, Math.ceil(hoursBetween(heatmap.start_utc, arrival)))
  return Math.min(arrivalHour + 1, lastHour)
}
