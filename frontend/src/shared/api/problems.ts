import type { Problem } from '../types'

export type ProblemCode = Problem['code'] | 'network_error' | 'unreadable_response'

const MESSAGES: Record<ProblemCode, string> = {
  validation_error: 'Some trip details are not valid. Check the form and try again.',
  rate_limited: 'Too many requests. Wait a minute and try again.',
  routing_unavailable: 'Routing is unavailable right now. Try again in a minute.',
  no_route_found: 'No truck route was found between these two places. Try different places.',
  weather_unavailable: 'Weather data is unavailable right now. Try again in a minute.',
  internal_error: 'Something went wrong on our side. Try again in a minute.',
  network_error: 'The server could not be reached. Check your connection and try again.',
  unreadable_response: 'The server sent an answer the app could not read. Try again in a minute.',
}

export class ApiError extends Error {
  readonly code: ProblemCode
  readonly fieldMessages: readonly string[]

  constructor(code: ProblemCode, fieldMessages: readonly string[] = []) {
    super(MESSAGES[code])
    this.code = code
    this.fieldMessages = fieldMessages
  }
}

export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return MESSAGES.internal_error
  return [error.message, ...error.fieldMessages].join(' ')
}
