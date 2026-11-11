// RR-18: every local time carries its zone abbreviation, generic ("MT") rather than "MST" or "MDT".
export function formatEta(arrivalUtc: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
    timeZoneName: 'shortGeneric',
  }).formatToParts(new Date(arrivalUtc))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? ''
  return `${part('weekday')} ${part('hour')}:${part('minute')} ${part('timeZoneName')}`
}
