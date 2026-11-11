import { useQuery } from '@tanstack/react-query'
import { api } from '../shared/api/client'

export function useRoutingCopyright(): string {
  const attribution = useQuery({ queryKey: ['attribution'], queryFn: api.getAttribution })
  if (attribution.data) return attribution.data.routing_copyright
  return attribution.isError ? 'Routing copyright text is unavailable right now.' : 'Loading…'
}
