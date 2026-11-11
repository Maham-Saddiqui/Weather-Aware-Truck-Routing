import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeCheckpoint, makeHeatmap, makeRoute } from '../shared/testing/fixtures'
import { ArrivalNote } from './ArrivalNote'

const HEATMAP = makeHeatmap(
  [{ position: { lat: 40, lon: -100 }, risk: '0'.repeat(49) }],
  '2026-11-12T14:00:00Z',
)
const ROUTE = makeRoute('route-a', {
  checkpoints: [
    makeCheckpoint({ eta_utc: '2026-11-12T14:00:00Z' }),
    makeCheckpoint({ index: 1, eta_utc: '2026-11-12T16:00:00Z' }),
  ],
})

const ROUTE_ACROSS_ZONES = makeRoute('route-b', {
  checkpoints: [
    makeCheckpoint({ eta_utc: '2026-11-12T14:00:00Z' }),
    makeCheckpoint({ index: 1, eta_utc: '2026-11-12T16:00:00Z', time_zone: 'America/Denver' }),
  ],
})

function tripArrivingAtHour(hour: number) {
  return makeRoute('route-c', {
    checkpoints: [
      makeCheckpoint({ eta_utc: '2026-11-12T14:00:00Z' }),
      makeCheckpoint({
        index: 1,
        eta_utc: new Date(Date.parse('2026-11-12T14:00:00Z') + hour * 3_600_000).toISOString(),
      }),
    ],
  })
}

function noteAt(hourOffset: number, route = ROUTE) {
  return (
    <ArrivalNote
      route={route}
      heatmap={HEATMAP}
      hourOffset={hourOffset}
      timeZone="America/Chicago"
    />
  )
}

describe('ArrivalNote says plainly that the truck has arrived (REQ-09, RR-19, FE-07)', () => {
  it('says nothing while the truck is still driving', () => {
    render(noteAt(1))

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('says when the truck arrived and that the forecast shown is for the route only', () => {
    render(noteAt(3))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Arrived Thu 10:00 CT. Showing the corridor forecast after arrival.',
    )
  })

  it('keeps saying it for every later hour', () => {
    render(noteAt(40))

    expect(screen.getByRole('status')).toHaveTextContent('Arrived Thu 10:00 CT.')
  })

  it('reads the arrival in the destination clock and says the slider clock once when it differs (RR-18)', () => {
    render(noteAt(3, ROUTE_ACROSS_ZONES))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Arrived Thu 09:00 MT (Thu 10:00 CT on the slider). Showing the corridor forecast after arrival.',
    )
  })
})

describe('ArrivalNote tells the user the forecast goes on where Play stops (REQ-09, RR-28, FE-07)', () => {
  it('says to press Play to keep going when the slider rests at the arrival hour', () => {
    render(noteAt(2))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Arrived Thu 10:00 CT. Press Play to keep going to +48 h.',
    )
  })

  it('keeps the whole arrival text short enough for one line on a wide screen and two on a phone', () => {
    render(noteAt(2, ROUTE_ACROSS_ZONES))

    expect(screen.getByRole('status').textContent.length).toBeLessThan(100)
  })

  it('goes back to the plain after-arrival wording one hour later', () => {
    render(noteAt(3))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Arrived Thu 10:00 CT. Showing the corridor forecast after arrival.',
    )
    expect(screen.getByRole('status')).not.toHaveTextContent('Press Play')
  })

  it('shows no hint while the truck is still driving', () => {
    render(noteAt(1))

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows no hint when the trip arrives at the end of the slider', () => {
    render(noteAt(48, tripArrivingAtHour(48)))

    expect(screen.getByRole('status')).not.toHaveTextContent('Press Play')
  })

  it('keeps the same reserved row before, at and after the hint, so the panel never changes height', () => {
    const { rerender } = render(noteAt(1))
    const reservedRow = screen.getByRole('status')
    const rowStyleBefore = getComputedStyle(reservedRow).minHeight
    expect(rowStyleBefore).not.toBe('')

    for (const hour of [2, 3]) {
      rerender(noteAt(hour))
      expect(screen.getByRole('status')).toBe(reservedRow)
      expect(getComputedStyle(reservedRow).minHeight).toBe(rowStyleBefore)
    }
  })

  it('is one live region that stays in place, so the hint is announced once', () => {
    const { rerender } = render(noteAt(1))
    const region = screen.getByRole('status')

    rerender(noteAt(2))

    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toBe(region)
  })
})
