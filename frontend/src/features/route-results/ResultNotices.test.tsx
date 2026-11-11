import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

function renderResults(results: TripResults, onRetry = vi.fn()) {
  render(
    <Providers>
      <RouteResults
        results={results}
        selectedRouteId={results.routes[0]?.id ?? null}
        selectedCheckpointIndex={null}
        onSelectRoute={vi.fn()}
        onSelectCheckpoint={vi.fn()}
        onRetry={onRetry}
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

describe('trying again when the weather service cannot rate the routes (REQ-12, RR-11)', () => {
  it.each(['busy', 'unavailable'] as const)(
    'offers a Try again button for weather %s',
    (weather) => {
      renderResults(resultsWith({ weather }))

      expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
    },
  )

  it.each(['ok', 'partial'] as const)('offers no Try again button for weather %s', (weather) => {
    renderResults(resultsWith({ weather }))

    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('plans the same trip again with one click', async () => {
    const onRetry = vi.fn()
    renderResults(resultsWith({ weather: 'busy' }), onRetry)

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('can be reached and pressed from the keyboard', async () => {
    const onRetry = vi.fn()
    renderResults(resultsWith({ weather: 'busy', routes: [] }), onRetry)

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('is disabled while a plan is already running, so the shared quota is not spent twice', () => {
    renderResults(resultsWith({ weather: 'busy', isPending: true }))

    expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled()
  })

  it('keeps the notice text inside one polite live region, announced once', () => {
    renderResults(resultsWith({ weather: 'busy' }))

    const text = screen.getByText('Weather service busy, try again in a minute')

    expect(screen.getAllByText('Weather service busy, try again in a minute')).toHaveLength(1)
    expect(text.closest('[aria-live="polite"]')).not.toBeNull()
  })
})
