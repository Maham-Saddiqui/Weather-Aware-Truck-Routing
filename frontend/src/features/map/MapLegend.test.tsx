import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MapLegend } from './MapLegend'
import type { Heatmap } from '../../shared/types'

const heatmap: Heatmap = {
  start_utc: '2026-11-12T13:00:00Z',
  hours: 49,
  points: [
    { position: { lat: 40, lon: -100 }, risk: '02x' },
    { position: { lat: 40, lon: -99 }, risk: '11x' },
  ],
}

describe('MapLegend (FE-09, NFR-03: always visible, risk in words)', () => {
  it('lists the five risk words and no data, with or without a heatmap', () => {
    render(<MapLegend heatmap={null} hourOffset={0} />)

    const words = screen.getAllByRole('listitem').map((item) => item.textContent)

    expect(words).toEqual(['Low', 'Moderate', 'High', 'Severe', 'No Travel', 'No data'])
  })

  it('says nothing about the heatmap when there is none', () => {
    render(<MapLegend heatmap={null} hourOffset={0} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('announces the worst corridor risk of the chosen hour in words', () => {
    const { rerender } = render(<MapLegend heatmap={heatmap} hourOffset={0} />)
    expect(screen.getByRole('status')).toHaveTextContent('Heatmap now: worst Moderate')

    rerender(<MapLegend heatmap={heatmap} hourOffset={1} />)
    expect(screen.getByRole('status')).toHaveTextContent('Heatmap now: worst High')
  })

  it('says when the chosen hour has no data at all (RR-11)', () => {
    render(<MapLegend heatmap={heatmap} hourOffset={2} />)

    expect(screen.getByRole('status')).toHaveTextContent('Heatmap: no data at this hour')
  })
})
