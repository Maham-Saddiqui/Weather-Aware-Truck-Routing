import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Providers } from './Providers'
import { RiskInfoDialog } from './RiskInfoDialog'

function renderDialog() {
  render(
    <Providers>
      <RiskInfoDialog open onClose={vi.fn()} />
    </Providers>,
  )
}

function cellsOf(level: string): string[] {
  const row = screen.getByRole('rowheader', { name: level }).closest('tr') as HTMLElement
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent)
}

describe('"How risk works" repeats the rules exactly (RR-31)', () => {
  it.each([
    ['Low', ['below 25', 'below 0.10', 'below 0.5']],
    ['Moderate', ['25 to 34', '0.10 to below 0.25', '0.5 to below 1.0']],
    ['High', ['35 to 44', '0.25 to below 0.50', '1.0 to below 2.0']],
    ['Severe', ['45 to 54', '0.50 to 1.00', '2.0 to 3.0']],
    ['No Travel', ['55 or more', 'above 1.00', 'above 3.0']],
  ])('lists the wind, rain and snow bands of %s (RR-03, RR-04, RR-05)', (level, bands) => {
    renderDialog()

    expect(cellsOf(level)).toEqual(bands)
  })

  it('states the three heavy-load wind rules with their exact thresholds (RR-06, RR-07, RR-08)', () => {
    renderDialog()

    expect(
      screen.getByText(/Wind of 35 to 44 mph with cargo over 40,000 lb is Severe\./),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Wind of 45 to 54 mph with cargo over 30,000 lb is No Travel\./),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Wind of 55 mph or more is No Travel for any load\./),
    ).toBeInTheDocument()
  })

  it('says a No Travel checkpoint or more than 10% of miles without data rules a route out (RR-22)', () => {
    renderDialog()

    expect(
      screen.getByText(
        'A route with a No Travel checkpoint, or with more than 10% of its miles lacking weather data, is never recommended.',
      ),
    ).toBeInTheDocument()
  })

  it('lists the ranking criteria in the order of the rules (RR-24)', () => {
    renderDialog()

    expect(
      screen.getByText(
        'Among the other routes the order is: fewest Severe miles, then fewest High miles, then lowest average risk, then shortest travel time.',
      ),
    ).toBeInTheDocument()
  })
})
