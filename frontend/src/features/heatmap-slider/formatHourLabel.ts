const MS_PER_HOUR = 3_600_000

// RR-18 and RR-28: the real clock time of departure + h hours in the given zone, with its abbreviation.
export function formatHourLabel(startUtc: string, hourOffset: number, timeZone: string): string {
  const instant = new Date(Date.parse(startUtc) + hourOffset * MS_PER_HOUR)
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
    timeZoneName: 'shortGeneric',
  }).formatToParts(instant)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? ''
  const clock = `${part('weekday')} ${part('hour')}:${part('minute')} ${part('timeZoneName')}`
  return `${clock}, +${String(hourOffset)} h`
}
