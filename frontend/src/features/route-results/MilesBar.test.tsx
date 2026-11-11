import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Providers } from '../../app/Providers'
import type { Route } from '../../shared/types'
import { MilesBar } from './MilesBar'

const MILES: Route['summary']['miles_by_level'] = {
  low: '42.5',
  moderate: '17.5',
  high: '0.0',
  severe: '0',
  no_travel: '0.0',
  no_data: '0.0',
}

function renderBar() {
  render(
    <Providers>
      <MilesBar milesByLevel={MILES} />
    </Providers>,
  )
}

describe('miles at each level on a route card (REQ-06)', () => {
  it('lists only the levels that have miles, with the server strings unchanged', () => {
    renderBar()

    expect(screen.getByText('Low 42.5 mi')).toBeInTheDocument()
    expect(screen.getByText('Moderate 17.5 mi')).toBeInTheDocument()
    expect(screen.queryByText(/^High /)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Severe /)).not.toBeInTheDocument()
    expect(screen.queryByText(/^No data /)).not.toBeInTheDocument()
  })

  it('shows all six levels, zeros included, behind the "All levels" button', async () => {
    renderBar()
    const button = screen.getByRole('button', { name: 'All levels' })
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('High 0.0 mi')).toBeInTheDocument()
    expect(screen.getByText('Severe 0 mi')).toBeInTheDocument()
    expect(screen.getByText('No data 0.0 mi')).toBeInTheDocument()
  })
})
