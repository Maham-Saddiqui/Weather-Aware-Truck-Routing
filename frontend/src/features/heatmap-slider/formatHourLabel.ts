import { formatClockTime } from '../../shared/time'

const MS_PER_HOUR = 3_600_000

// RR-28: the real clock time of departure + h hours in the given zone, with its abbreviation.
export function formatHourLabel(startUtc: string, hourOffset: number, timeZone: string): string {
  const instant = new Date(Date.parse(startUtc) + hourOffset * MS_PER_HOUR)
  return `${formatClockTime(instant.toISOString(), timeZone)}, +${String(hourOffset)} h`
}
