import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/Providers'
import { HEATMAP, makeRoute, RECOMMENDATION } from '../../shared/testing/fixtures'
import { RouteResults } from './RouteResults'
import { EMPTY_RESULTS, type TripResults } from './tripResults'

function view(results: TripResults) {
  return (
    <Providers>
      <RouteResults
        results={results}
        selectedRouteId={null}
        selectedCheckpointIndex={null}
        onSelectRoute={vi.fn()}
        onSelectCheckpoint={vi.fn()}
        onRetry={vi.fn()}
      />
    </Providers>
  )
}

const FIRST_ROUTE: TripResults = {
  ...EMPTY_RESULTS,
  phase: 'partial',
  routes: [makeRoute('route-a')],
  heatmap: HEATMAP,
}
const FULL_SET: TripResults = {
  ...FIRST_ROUTE,
  phase: 'complete',
  routes: [makeRoute('route-a'), makeRoute('route-b', { rank: 2 })],
  recommendation: RECOMMENDATION,
}

describe('announcing the arrival of results (REQ-10, NFR-03)', () => {
  it('says once, in a status that was already on the page, that route options are ready', () => {
    const { rerender } = render(view(EMPTY_RESULTS))
    const announcement = screen.getByRole('status')
    expect(announcement).toBeEmptyDOMElement()

    rerender(view(FIRST_ROUTE))
    expect(screen.getByRole('status')).toBe(announcement)
    expect(announcement).toHaveTextContent('Route options are ready')

    rerender(view(FULL_SET))
    expect(screen.getByRole('status')).toBe(announcement)
    expect(announcement).toHaveTextContent('Route options are ready')
  })

  it('is one pixel in size, so it can never stretch the page (NFR-04)', () => {
    render(view(EMPTY_RESULTS))

    const style = getComputedStyle(screen.getByRole('status'))

    expect(style.width).toBe('1px')
    expect(style.height).toBe('1px')
  })

  it('goes quiet when the results are no longer ready, so the next arrival is announced again', () => {
    const { rerender } = render(view(FULL_SET))
    const announcement = screen.getByRole('status')

    rerender(view({ ...EMPTY_RESULTS, phase: 'failed', error: new Error('x') }))

    expect(announcement).toBeEmptyDOMElement()
  })
})
