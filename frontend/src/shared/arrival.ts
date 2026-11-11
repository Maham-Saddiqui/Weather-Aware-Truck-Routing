import type { Route } from './types'

// The last checkpoint is the destination (RR-19), so its ETA is when the truck arrives.
export function arrivalEtaUtc(route: Route): string | null {
  return route.checkpoints.at(-1)?.eta_utc ?? null
}
