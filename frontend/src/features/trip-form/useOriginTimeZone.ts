import { skipToken, useQuery } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import { browserTimeZone } from '../../shared/time'
import type { Place } from '../../shared/types'

export type OriginZoneState = 'no_origin' | 'finding' | 'failed' | 'found'

export interface OriginZone {
  state: OriginZoneState
  timeZone: string
  retry: () => void
}

export function useOriginTimeZone(origin: Place | null): OriginZone {
  const lookup = useQuery({
    queryKey: ['timezone', origin?.lat, origin?.lon],
    queryFn: origin ? ({ signal }) => api.getTimeZone(origin, signal) : skipToken,
  })
  const retry = () => {
    void lookup.refetch()
  }
  if (!origin) return { state: 'no_origin', timeZone: browserTimeZone(), retry }
  if (lookup.data) return { state: 'found', timeZone: lookup.data.time_zone, retry }
  const state = lookup.isError ? 'failed' : 'finding'
  return { state, timeZone: browserTimeZone(), retry }
}

export function zoneBlockMessage(state: OriginZoneState): string | undefined {
  if (state === 'finding')
    return 'We are still finding the origin’s time zone. Try again in a moment.'
  if (state === 'failed') {
    return 'We could not find the origin’s time zone, so we cannot read the departure time. Use “Look up the time zone again”.'
  }
  return undefined
}
