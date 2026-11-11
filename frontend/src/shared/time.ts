import dayjs, { type Dayjs } from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { DEFAULT_DEPARTURE_HOUR, MINUTES_PER_HOUR, SECONDS_PER_MINUTE } from './constants'

dayjs.extend(utc)
dayjs.extend(timezone)

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// Built from the calendar date and wall-clock text, because adding a day to a zoned time keeps today's UTC offset
// and is one hour off on the day before a daylight-saving change.
export function tomorrowMorning(now: Dayjs, timeZone: string): Dayjs {
  const today = now.tz(timeZone).format('YYYY-MM-DD')
  const tomorrow = dayjs.utc(today).add(1, 'day').format('YYYY-MM-DD')
  const hour = String(DEFAULT_DEPARTURE_HOUR).padStart(2, '0')
  return dayjs.tz(`${tomorrow} ${hour}:00`, timeZone)
}

// RR-18: every local time carries its zone abbreviation, generic ("MT") rather than "MST" or "MDT".
const ZONE_NAME_STYLE = 'shortGeneric'

function clockParts(isoInstant: string, timeZone: string): Map<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: ZONE_NAME_STYLE,
  }).formatToParts(new Date(isoInstant))
  return new Map(parts.map((part) => [part.type, part.value]))
}

export function formatClockTime(isoInstant: string, timeZone: string): string {
  const part = clockParts(isoInstant, timeZone)
  return `${part.get('weekday') ?? ''} ${part.get('hour') ?? ''}:${part.get('minute') ?? ''} ${part.get('timeZoneName') ?? ''}`
}

export function formatLocalTime(isoInstant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: ZONE_NAME_STYLE,
  }).format(new Date(isoInstant))
}

export function zoneAbbreviation(isoInstant: string, timeZone: string): string {
  return clockParts(isoInstant, timeZone).get('timeZoneName') ?? timeZone
}

const MS_PER_HOUR = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * 1000

// The moment the forecast slider points at: departure plus the chosen hours (RR-28).
export function instantAfterHours(startUtc: string, hours: number): Date {
  return new Date(Date.parse(startUtc) + hours * MS_PER_HOUR)
}

export function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / SECONDS_PER_MINUTE)
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  const minutes = totalMinutes % MINUTES_PER_HOUR
  return hours === 0 ? `${String(minutes)} min` : `${String(hours)} h ${String(minutes)} min`
}

export { dayjs }
