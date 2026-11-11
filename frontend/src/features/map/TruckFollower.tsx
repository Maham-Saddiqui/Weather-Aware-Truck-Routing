import type { Heatmap, Route } from '../../shared/types'
import { truckAtHour } from './truckAtHour'
import { useFollowTruck } from './useFollowTruck'

interface TruckFollowerProps {
  route: Route
  heatmap: Heatmap
  hourOffset: number
}

export function TruckFollower({ route, heatmap, hourOffset }: TruckFollowerProps) {
  useFollowTruck(truckAtHour(route, heatmap, hourOffset)?.position ?? null, route)
  return null
}
