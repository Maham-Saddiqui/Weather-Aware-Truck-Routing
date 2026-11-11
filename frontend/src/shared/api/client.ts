import { API_PATH_PREFIX } from '../constants'
import type { CompareTripResponse, PrimaryTripResponse, Problem, TripRequest } from '../types'
import { ApiError } from './problems'

function buildUrl(path: string): URL {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? window.location.origin
  return new URL(`${API_PATH_PREFIX}${path}`, baseUrl)
}

async function readProblem(response: Response): Promise<ApiError> {
  try {
    const problem = (await response.json()) as Problem
    return new ApiError(problem.code, Object.values(problem.field_errors ?? {}).flat())
  } catch {
    return new ApiError('unreadable_response')
  }
}

async function send(url: URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (error) {
    if (init.signal?.aborted) throw error
    throw new ApiError('network_error')
  }
}

async function request<Body>(path: string, init: RequestInit = {}): Promise<Body> {
  const response = await send(buildUrl(path), init)
  if (!response.ok) throw await readProblem(response)
  try {
    return (await response.json()) as Body
  } catch {
    throw new ApiError('unreadable_response')
  }
}

function postTrip<Body>(path: string, trip: TripRequest, signal: AbortSignal): Promise<Body> {
  return request<Body>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trip),
    signal,
  })
}

export const api = {
  getHealth: () => request<{ status: 'ok' }>('/health'),
  getAttribution: () => request<{ routing_copyright: string }>('/attribution'),
  getTimeZone: (position: { lat: number; lon: number }, signal: AbortSignal) =>
    request<{ time_zone: string }>(
      `/timezone?lat=${String(position.lat)}&lon=${String(position.lon)}`,
      {
        signal,
      },
    ),
  planPrimaryTrip: (trip: TripRequest, signal: AbortSignal) =>
    postTrip<PrimaryTripResponse>('/trips/primary', trip, signal),
  compareTrip: (trip: TripRequest, signal: AbortSignal) =>
    postTrip<CompareTripResponse>('/trips/compare', trip, signal),
}
