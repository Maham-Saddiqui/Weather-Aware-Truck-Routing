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
  it('tells a screen reader "from the origin to the destination" with no visible "to"', () => {
    summary()

    expect(
      screen.getByRole('heading', { name: 'from Chicago, Illinois to Denver, Colorado' }),
    ).toBeVisible()
  })

  it('shows the same A and B badges as the map pins', () => {
    summary()

    const heading = screen.getByRole('heading')
    expect(heading).toHaveTextContent('Afrom Chicago, IllinoisB to Denver, Colorado')
  })

  it('puts the departure on its own line, apart from weight and checkpoint spacing', () => {
    summary()

    expect(screen.getByText('Departs Thu, Nov 12, 08:00 CT')).toBeVisible()
    expect(screen.getByText('42,000 lb, checkpoint every 25 miles')).toBeVisible()
  })

  it('shows the cargo weight with a thousands separator while the input keeps plain digits', () => {
    summary()

    expect(screen.getByText(/^42,000 lb, checkpoint every 25 miles/)).toBeVisible()
  })

  it('shows the actions it is given next to the trip', () => {
    render(
      <Providers>
        <TripSummary
          values={VALUES}
          departureZone="America/Chicago"
          onEdit={() => undefined}
          actions={<button type="button">Copy link</button>}
        />
      </Providers>,
    )

    expect(screen.getByRole('button', { name: 'Copy link' })).toBeVisible()
  })
})
