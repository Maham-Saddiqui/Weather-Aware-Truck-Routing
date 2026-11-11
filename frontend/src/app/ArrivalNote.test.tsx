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

function noteAt(hourOffset: number) {
  return (
    <ArrivalNote
      route={ROUTE}
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
    render(noteAt(2))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Truck arrived at Thu 10:00 CT. Showing the forecast along the route after arrival.',
    )
  })

  it('keeps saying it for every later hour', () => {
    render(noteAt(40))

    expect(screen.getByRole('status')).toHaveTextContent('Truck arrived at Thu 10:00 CT.')
  })
})
