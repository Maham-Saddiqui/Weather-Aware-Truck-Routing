import { act, renderHook, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/Providers'
import { useHealth } from '../../shared/api/useHealth'
import { problemResponse } from '../../shared/testing/handlers'
import { makeCompareResponse, makePrimaryResponse } from '../../shared/testing/fixtures'
import { server } from '../../shared/testing/server'
import type { TripRun } from '../../shared/types'
import { useTripResults } from './useTripResults'

const RUN: TripRun = {
  runId: 1,
  trip: {
    origin: { label: 'A', lat: 41, lon: -87 },
    destination: { label: 'B', lat: 39, lon: -104 },
    departure_utc: '2026-11-12T14:00:00Z',
    load_lb: 10_000,
    spacing_miles: 25,
  },
}

function wrapper({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>
}

describe('the two parallel trip requests (FE-18, REQ-10)', () => {
  it('shows the primary route first and then the full set', async () => {
    server.use(
      http.post('*/api/v1/trips/compare', async () => {
        await delay(400)
        return HttpResponse.json(makeCompareResponse())
      }),
    )

    const { result } = renderHook(() => useTripResults(RUN), { wrapper })

    await waitFor(() => {
      expect(result.current.phase).toBe('partial')
    })
    expect(result.current.routes).toHaveLength(1)
    await waitFor(() => {
      expect(result.current.phase).toBe('complete')
    })
    expect(result.current.routes).toHaveLength(2)
  })

  it('keeps the same routes array between renders while waiting for compare, so the map does not refit (REQ-09, FE-08)', async () => {
    server.use(
      http.post('*/api/v1/trips/compare', async () => {
        await delay(400)
        return HttpResponse.json(makeCompareResponse())
      }),
    )

    const { result, rerender } = renderHook(() => useTripResults(RUN), { wrapper })
    await waitFor(() => {
      expect(result.current.phase).toBe('partial')
    })
    const routesBefore = result.current.routes

    rerender()

    expect(result.current.routes).toBe(routesBefore)
  })

  it('ignores a late primary once compare has arrived', async () => {
    server.use(
      http.post('*/api/v1/trips/primary', async () => {
        await delay(120)
        return HttpResponse.json(makePrimaryResponse())
      }),
    )

    const { result } = renderHook(() => useTripResults(RUN), { wrapper })

    await waitFor(() => {
      expect(result.current.phase).toBe('complete')
    })
    await delay(200)
    expect(result.current.phase).toBe('complete')
    expect(result.current.routes).toHaveLength(2)
  })

  it('keeps the primary route and flags alternatives when compare fails', async () => {
    server.use(
      http.post('*/api/v1/trips/compare', () => problemResponse(503, 'routing_unavailable')),
    )

    const { result } = renderHook(() => useTripResults(RUN), { wrapper })

    await waitFor(() => {
      expect(result.current.alternativesUnavailable).toBe(true)
    })
    expect(result.current.routes).toHaveLength(1)
    expect(result.current.isPending).toBe(false)
  })

  it('fails with the server problem when both requests fail', async () => {
    server.use(
      http.post('*/api/v1/trips/primary', () => problemResponse(422, 'no_route_found')),
      http.post('*/api/v1/trips/compare', () => problemResponse(422, 'no_route_found')),
    )

    const { result } = renderHook(() => useTripResults(RUN), { wrapper })

    await waitFor(() => {
      expect(result.current.phase).toBe('failed')
    })
  })
})

describe('the server is waking up (REQ-12)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  async function loadingFor(seconds: number, healthAnswers: boolean) {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    server.use(
      http.get('*/api/v1/health', async () => {
        if (!healthAnswers) await delay('infinite')
        return HttpResponse.json({ status: 'ok' })
      }),
      http.post('*/api/v1/trips/primary', () => delay('infinite')),
      http.post('*/api/v1/trips/compare', () => delay('infinite')),
    )
    const { result } = renderHook(
      () => {
        useHealth()
        return useTripResults(RUN)
      },
      { wrapper },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(seconds * 1000)
    })
    return result
  }

  it('says so when the health ping has not been answered 3 seconds into planning', async () => {
    const result = await loadingFor(3, false)

    expect(result.current.isServerWaking).toBe(true)
  })

  it('does not say so while planning is slow but the server has answered the health ping', async () => {
    const result = await loadingFor(5, true)

    expect(result.current.phase).toBe('loading')
    expect(result.current.isServerWaking).toBe(false)
  })

  it('does not say so before 3 seconds have passed', async () => {
    const result = await loadingFor(2, false)

    expect(result.current.isServerWaking).toBe(false)
  })
})
