import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MapLegend } from './MapLegend'

describe('MapLegend (FE-09, NFR-03: always visible, risk in words)', () => {
  it('lists the five risk words and no data', () => {
    render(<MapLegend />)

    const words = screen.getAllByRole('listitem').map((item) => item.textContent)

    expect(words).toEqual(['Low', 'Moderate', 'High', 'Severe', 'No Travel', 'No data'])
  })

  it('says that faint green on the map means low risk and grey means no weather data (FE-09, RR-11)', () => {
    render(<MapLegend />)

    expect(
      screen.getByText('Faint green on the map means low risk; grey means no weather data.'),
    ).toBeInTheDocument()
  })

  it('leaves the live heatmap status to the status chip next to the slider', () => {
    render(<MapLegend />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

function showOnPhone() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('max-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

describe('MapLegend on a phone (NFR-04: the legend must not cover the routes)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('folds the notes away and offers a button to open them', async () => {
    showOnPhone()
    render(<MapLegend />)
    const button = screen.getByRole('button', { name: 'Legend details' })
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('has no details button on a wide screen, where the notes are always shown', () => {
    render(<MapLegend />)

    expect(screen.queryByRole('button', { name: 'Legend details' })).not.toBeInTheDocument()
  })
})
