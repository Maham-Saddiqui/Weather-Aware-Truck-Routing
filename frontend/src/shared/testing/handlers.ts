import { http, HttpResponse } from 'msw'
import { API_PATH_PREFIX } from '../constants'
import { makeCompareResponse, makePrimaryResponse } from './fixtures'

const api = (path: string) => `*${API_PATH_PREFIX}${path}`

export const defaultHandlers = [
  http.get(api('/health'), () => HttpResponse.json({ status: 'ok' })),
  http.get(api('/attribution'), () => HttpResponse.json({ routing_copyright: '©TomTom (test)' })),
  http.get(api('/timezone'), () => HttpResponse.json({ time_zone: 'America/Chicago' })),
  http.post(api('/trips/primary'), () => HttpResponse.json(makePrimaryResponse())),
  http.post(api('/trips/compare'), () => HttpResponse.json(makeCompareResponse())),
]

export function problemResponse(status: number, code: string, fieldErrors?: object) {
  return HttpResponse.json(
    { type: 'about:blank', title: code, status, code, field_errors: fieldErrors },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}
