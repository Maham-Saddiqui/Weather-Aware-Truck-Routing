import type { Route } from '../../shared/types'
import { describeDrivingFactors } from './drivingFactors'

const SHOWN_CHECKPOINTS_PER_ROUTE = 3

export function describeRouteProblems(route: Route, position: number): string[] {
  const name = `Route ${String(position)}`
  const noTravel = route.checkpoints.filter((checkpoint) => checkpoint.level === 'no_travel')
  const lines = noTravel.slice(0, SHOWN_CHECKPOINTS_PER_ROUTE).map((checkpoint) => {
    const why = describeDrivingFactors(checkpoint).join(' ')
    return `${name}: No Travel at mile ${checkpoint.distance_miles}. ${why}`
  })
  const hidden = noTravel.length - SHOWN_CHECKPOINTS_PER_ROUTE
  if (hidden > 0) lines.push(`${name}: and ${String(hidden)} more No Travel checkpoints.`)
  if (route.summary.ineligible_reason === 'not_enough_weather_data') {
    lines.push(`${name}: not enough weather data to rate it.`)
  }
  return lines
}
