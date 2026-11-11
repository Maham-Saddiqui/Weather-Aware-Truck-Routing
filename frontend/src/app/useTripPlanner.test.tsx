import { act, renderHook, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeCompareResponse, makeRoute } from '../shared/testing/fixtures'
import { problemResponse } from '../shared/testing/handlers'
import { server } from '../shared/testing/server'
import type { TripRequest } from '../shared/types'
import { Providers } from './Providers'
import { useTripPlanner } from './useTripPlanner'

const TRIP: TripRequest = {
  origin: { label: 'Chicago, Illinois', lat: 41.8781, lon: -87.6298 },
  destination: { label: 'Denver, Colorado', lat: 39.7392, lon: -104.9903 },
  departure_utc: '2026-11-12T14:00:00.000Z',
  load_lb: 42_000,
  spacing_miles: 25,
}

function wrapper({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>
}

async function planTrip() {
  const hook = renderHook(() => useTripPlanner(), { wrapper })
  act(() => {
    hook.result.current.submit(TRIP)
  })
  await waitFor(() => {
    expect(hook.result.current.results.phase).toBe('complete')
  })
  return hook
}

afterEach(() => {
  vi.useRealTimers()
  window.history.replaceState(null, '', '/')
})

describe('which route and checkpoint are chosen (REQ-08)', () => {
  it('chooses the first route the server sent when nothing was chosen', async () => {
    const { result } = await planTrip()

    expect(result.current.selectedRouteId).toBe('route-a')
    expect(result.current.selectedCheckpointIndex).toBeNull()
  })

  it('remembers a checkpoint and forgets it when another route is chosen', async () => {
    const { result } = await planTrip()

    act(() => {
      result.current.selectCheckpoint('route-a', 2)
    })
    expect(result.current.selectedCheckpointIndex).toBe(2)

    act(() => {
      result.current.selectRoute('route-b')
    })
    expect(result.current.selectedRouteId).toBe('route-b')
    expect(result.current.selectedCheckpointIndex).toBeNull()
  })

  it('keeps the chosen route and checkpoint when the other routes arrive (REQ-10)', async () => {
    server.use(
      http.post('*/api/v1/trips/compare', async () => {
        await delay(300)
        return HttpResponse.json(makeCompareResponse())
      }),
    )
    const hook = renderHook(() => useTripPlanner(), { wrapper })
    act(() => {
      hook.result.current.submit(TRIP)
    })
    await waitFor(() => {
      expect(hook.result.current.results.phase).toBe('partial')
    })
    act(() => {
      hook.result.current.selectCheckpoint('route-a', 1)
    })

    await waitFor(() => {
      expect(hook.result.current.results.phase).toBe('complete')
    })

    expect(hook.result.current.selectedRouteId).toBe('route-a')
    expect(hook.result.current.selectedCheckpointIndex).toBe(1)
  })

  it('falls back to the first route when the chosen route is gone after a new trip', async () => {
    const { result } = await planTrip()
    act(() => {
      result.current.selectRoute('route-b')
    })
    server.use(
      http.post('*/api/v1/trips/compare', () =>
        HttpResponse.json(makeCompareResponse([makeRoute('route-a')])),
      ),
    )

    act(() => {
      result.current.submit({ ...TRIP, load_lb: 30_000 })
    })

    await waitFor(() => {
      expect(result.current.results.routes).toHaveLength(1)
    })
    expect(result.current.selectedRouteId).toBe('route-a')
  })
})

describe('planning and trying again (REQ-14)', () => {
  it('writes the planned trip into the page address without adding history', async () => {
    const lengthBefore = window.history.length
    await planTrip()

    expect(new URLSearchParams(window.location.search).get('o')).toBe('Chicago, Illinois')
    expect(window.history.length).toBe(lengthBefore)
  })

  it('numbers each run so a new trip is never mistaken for the last one', async () => {
    const { result } = await planTrip()
    const firstRun = result.current.run?.runId

    act(() => {
      result.current.submit(TRIP)
    })

    expect(result.current.run?.runId).toBe((firstRun ?? 0) + 1)
  })

  it('asks the server again for the same trip when retrying after a failure', async () => {
    server.use(
      http.post('*/api/v1/trips/primary', () => problemResponse(503, 'routing_unavailable')),
      http.post('*/api/v1/trips/compare', () => problemResponse(503, 'routing_unavailable')),
    )
    const { result } = renderHook(() => useTripPlanner(), { wrapper })
    act(() => {
      result.current.submit(TRIP)
    })
    await waitFor(() => {
      expect(result.current.results.phase).toBe('failed')
    })
    server.resetHandlers()

    act(() => {
      result.current.retry()
    })

    await waitFor(() => {
      expect(result.current.results.phase).toBe('complete')
    })
    expect(result.current.run?.trip).toEqual(TRIP)
  })
})
