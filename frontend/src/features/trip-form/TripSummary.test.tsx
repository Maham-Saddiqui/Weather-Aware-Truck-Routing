import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Providers } from '../../app/Providers'
import { dayjs } from '../../shared/time'
import { TripSummary } from './TripSummary'
import type { TripFormValues } from './validation'

const VALUES: TripFormValues = {
  origin: { label: 'Chicago, Illinois', lat: 41.88, lon: -87.63 },
  destination: { label: 'Denver, Colorado', lat: 39.74, lon: -104.99 },
  departure: dayjs('2026-11-12T14:00:00Z'),
  loadLb: '42000',
  spacingMiles: 25,
}

function summary(values: TripFormValues = VALUES) {
  render(
    <Providers>
      <TripSummary values={values} departureZone="America/Chicago" onEdit={() => undefined} />
    </Providers>,
  )
}

describe('collapsed trip summary (REQ-08)', () => {
  it('reads as the two places joined by "to", whatever letters decorate it', () => {
    summary()

    expect(
      screen.getByRole('heading', { name: 'Chicago, Illinois to Denver, Colorado' }),
    ).toBeVisible()
  })

  it('shows the same A and B badges as the map pins', () => {
    summary()

    const heading = screen.getByRole('heading')
    expect(heading).toHaveTextContent('A Chicago, Illinois to B Denver, Colorado')
  })
})
