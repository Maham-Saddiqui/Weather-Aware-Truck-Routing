import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../testing/server'
import { problemResponse } from '../testing/handlers'
import { api } from './client'
import { ApiError, describeError } from './problems'

const TRIP = {
  origin: { label: 'A', lat: 41, lon: -87 },
  destination: { label: 'B', lat: 39, lon: -104 },
  departure_utc: '2026-11-12T14:00:00Z',
  load_lb: 10_000,
  spacing_miles: 25,
} as const

describe('API client', () => {
  it('turns a problem response into a plain message (REQ-12)', async () => {
    server.use(http.post('*/api/v1/trips/primary', () => problemResponse(422, 'no_route_found')))

    const failure = await api
      .planPrimaryTrip(TRIP, new AbortController().signal)
      .catch((e: unknown) => e)

    expect(failure).toBeInstanceOf(ApiError)
    expect(describeError(failure)).toBe(
      'No truck route was found between these two places. Try different places.',
    )
  })

  it('adds the server field messages to a validation problem (RR-29)', async () => {
    server.use(
      http.post('*/api/v1/trips/compare', () =>
        problemResponse(400, 'validation_error', { departure_utc: ['Departure is in the past.'] }),
      ),
    )

    const failure = await api
      .compareTrip(TRIP, new AbortController().signal)
      .catch((e: unknown) => e)

    expect(describeError(failure)).toContain('Departure is in the past.')
  })

  it('reports an unreachable server in plain words (REQ-12)', async () => {
    server.use(http.get('*/api/v1/health', () => HttpResponse.error()))

    const failure = await api.getHealth().catch((e: unknown) => e)

    expect(describeError(failure)).toContain('could not be reached')
  })
})
