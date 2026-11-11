import { instantAfterHours } from '../../shared/time'
import type { Heatmap, Route } from '../../shared/types'
import { truckPositionAt } from './truckPosition'
import type { TruckPosition } from './truckPosition'

export interface TruckAtHour extends TruckPosition {
  instant: Date
  timeZone: string
}

export function truckAtHour(
  route: Route,
  heatmap: Heatmap,
  hourOffset: number,
): TruckAtHour | null {
  const instant = instantAfterHours(heatmap.start_utc, hourOffset)
  const truck = truckPositionAt(route.checkpoints, instant.getTime())
  const timeZone = route.checkpoints[0]?.time_zone
  return truck && timeZone ? { ...truck, instant, timeZone } : null
}
