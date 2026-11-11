import dayjs, { type Dayjs } from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { DEFAULT_DEPARTURE_HOUR, MINUTES_PER_HOUR, SECONDS_PER_MINUTE } from './constants'

dayjs.extend(utc)
dayjs.extend(timezone)

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function tomorrowMorning(now: Dayjs, timeZone: string): Dayjs {
  return now
    .tz(timeZone)
    .add(1, 'day')
    .hour(DEFAULT_DEPARTURE_HOUR)
    .minute(0)
    .second(0)
    .millisecond(0)
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
    timeZoneName: 'short',
  }).format(new Date(isoInstant))
}

export function zoneAbbreviation(isoInstant: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(
    new Date(isoInstant),
  )
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone
}

export function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / SECONDS_PER_MINUTE)
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  const minutes = totalMinutes % MINUTES_PER_HOUR
  return hours === 0 ? `${String(minutes)} min` : `${String(hours)} h ${String(minutes)} min`
}

export { dayjs }
