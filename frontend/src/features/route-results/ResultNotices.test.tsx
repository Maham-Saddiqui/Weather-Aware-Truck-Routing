import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/Providers'
import { HEATMAP, makeRoute, RECOMMENDATION } from '../../shared/testing/fixtures'
import { RouteResults } from './RouteResults'
import { EMPTY_RESULTS, type TripResults } from './tripResults'

const ONE_ROUTE = /Only one route could be found for this trip\./

function resultsWith(changes: Partial<TripResults>): TripResults {
  return {
    ...EMPTY_RESULTS,
    phase: 'complete',
    routes: [makeRoute('route-a'), makeRoute('route-b', { rank: 2 })],
    recommendation: RECOMMENDATION,
    heatmap: HEATMAP,
    routingProvider: 'tomtom',
    weather: 'ok',
    ...changes,
  }
}

function renderResults(results: TripResults) {
  render(
    <Providers>
      <RouteResults
        results={results}
        selectedRouteId={results.routes[0]?.id ?? null}
        selectedCheckpointIndex={null}
        onSelectRoute={vi.fn()}
        onSelectCheckpoint={vi.fn()}
        onRetry={vi.fn()}
      />
    </Providers>,
  )
}

describe('a long trip (REQ-03, REQ-12)', () => {
  it('says the wait can reach 30 seconds while alternatives load', () => {
    renderResults(
      resultsWith({ phase: 'partial', routes: [makeRoute('route-a')], recommendation: null }),
    )

    expect(
      screen.getByText(/This can take up to 30 seconds on very long trips/),
    ).toBeInTheDocument()
  })

  it('says only one route could be found when the full comparison has a single route', () => {
    renderResults(resultsWith({ routes: [makeRoute('route-a')] }))

    expect(screen.getByText(ONE_ROUTE)).toBeInTheDocument()
  })

  it('does not say it while alternatives are still loading', () => {
    renderResults(
      resultsWith({ phase: 'partial', routes: [makeRoute('route-a')], recommendation: null }),
    )

    expect(screen.queryByText(ONE_ROUTE)).not.toBeInTheDocument()
  })

  it('does not say it when the comparison failed', () => {
    renderResults(
      resultsWith({
        phase: 'partial',
        routes: [makeRoute('route-a')],
        alternativesUnavailable: true,
      }),
    )

    expect(screen.queryByText(ONE_ROUTE)).not.toBeInTheDocument()
  })

  it('does not say it when several routes came back', () => {
    renderResults(resultsWith({}))

    expect(screen.queryByText(ONE_ROUTE)).not.toBeInTheDocument()
  })
})
