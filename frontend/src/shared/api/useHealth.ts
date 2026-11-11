import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { HEALTH_FRESH_MS } from '../constants'
import { api } from './client'

const healthQuery = queryOptions({
  queryKey: ['health'],
  queryFn: api.getHealth,
  staleTime: HEALTH_FRESH_MS,
})

// A free server sleeps again after a while, so an old answer no longer proves it is awake (REQ-12).
export function useHealth() {
  const queryClient = useQueryClient()
  const { isSuccess, isStale } = useQuery(healthQuery)
  const pingIfStale = useCallback(() => {
    queryClient.query(healthQuery).catch(() => undefined)
  }, [queryClient])
  return { isAwake: isSuccess && !isStale, pingIfStale }
}
