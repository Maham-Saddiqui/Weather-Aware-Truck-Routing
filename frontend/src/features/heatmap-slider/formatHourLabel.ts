import { formatClockTime, instantAfterHours } from '../../shared/time'

// RR-28: the real clock time of departure + h hours in the given zone, with its abbreviation.
export function formatHourLabel(startUtc: string, hourOffset: number, timeZone: string): string {
  const instant = instantAfterHours(startUtc, hourOffset)
  return `${formatClockTime(instant.toISOString(), timeZone)}, +${String(hourOffset)} h`
}
