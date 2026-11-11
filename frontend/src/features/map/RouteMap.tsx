import type { RouteMapProps } from '../../shared/types'

export function RouteMap({ routes }: RouteMapProps) {
  return <div role="img" aria-label={`Map showing ${String(routes.length)} routes`} />
}
