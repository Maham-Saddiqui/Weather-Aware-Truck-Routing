import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/Providers'
import { ApiError } from '../../shared/api/problems'
import { HEATMAP, makeCheckpoint, makeRoute, RECOMMENDATION } from '../../shared/testing/fixtures'
import type { Recommendation, Route } from '../../shared/types'
import { RouteResults } from './RouteResults'
import { EMPTY_RESULTS, type TripResults } from './tripResults'

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

function renderResults(
  results: TripResults,
  handlers: Partial<Parameters<typeof RouteResults>[0]> = {},
) {
  const props = {
    results,
    selectedRouteId: results.routes[0]?.id ?? null,
    selectedCheckpointIndex: null,
    onSelectRoute: vi.fn(),
    onSelectCheckpoint: vi.fn(),
    onRetry: vi.fn(),
    ...handlers,
  }
  render(
    <Providers>
      <RouteResults {...props} />
    </Providers>,
  )
  return props
}

function summaryWith(route: Route, changes: Partial<Route['summary']>): Route {
  return { ...route, summary: { ...route.summary, ...changes } }
}

describe('route cards (REQ-06, FE-19)', () => {
  it('shows routes in exactly the order the server sent them', () => {
    const first = summaryWith(makeRoute('route-x', { rank: 2 }), { distance_miles: '70.0' })
    const second = summaryWith(makeRoute('route-y', { rank: 1 }), { distance_miles: '60.5' })
    renderResults(resultsWith({ routes: [first, second], recommendation: null }))

    const firstCard = within(screen.getByRole('article', { name: 'Route 1' }))
    const secondCard = within(screen.getByRole('article', { name: 'Route 2' }))

    expect(firstCard.getByText('70.0 mi')).toBeInTheDocument()
    expect(secondCard.getByText('60.5 mi')).toBeInTheDocument()
  })

  it('shows the server strings unchanged with a word and an icon per level (FE-05, RR-21)', () => {
    renderResults(resultsWith({ routes: [makeRoute('route-a')] }))

    expect(screen.getByText('Low 42.5 mi')).toBeInTheDocument()
    expect(screen.getByText('Moderate 17.5 mi')).toBeInTheDocument()
    expect(screen.getByText('No data 0 mi')).toBeInTheDocument()
    expect(screen.getByText('Average risk 0.29')).toBeInTheDocument()
    expect(
      within(screen.getByRole('article', { name: 'Route 1' })).getByText('Moderate', {
        selector: '.MuiChip-label',
      }),
    ).toBeInTheDocument()
  })

  it('shows a dash instead of an average when no mile has data (RR-21)', () => {
    const route = summaryWith(makeRoute('route-a'), { average_risk: null, worst_level: null })
    renderResults(resultsWith({ routes: [route] }))

    expect(screen.getByText('Average risk —')).toBeInTheDocument()
  })

  it('shows the arrival in the destination checkpoint zone with its abbreviation (RR-18)', () => {
    const route = summaryWith(makeRoute('route-a'), { arrival_utc: '2026-11-12T21:05:00Z' })
    route.checkpoints = [makeCheckpoint({ time_zone: 'America/Denver' })]
    renderResults(resultsWith({ routes: [route] }))

    expect(screen.getByText(/14:05 MT/)).toBeInTheDocument()
  })

  it('selects a route by its id when the card is pressed (REQ-08)', async () => {
    const props = renderResults(resultsWith({}))

    await userEvent.click(screen.getByRole('button', { name: 'Route 2' }))

    expect(props.onSelectRoute).toHaveBeenCalledWith('route-b')
  })
})

describe('route cards for keyboard and screen readers (FE-07, NFR-03)', () => {
  it('keeps the route summary outside the select button so it is read as text', () => {
    renderResults(resultsWith({}))

    const card = screen.getByRole('article', { name: 'Route 1' })

    expect(within(card).getByRole('heading', { name: 'Route 1' })).toBeInTheDocument()
    expect(within(card).getByText('Recommended')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Route 1' })).toHaveTextContent(/^Route 1$/)
  })

  it.each([['{Enter}'], [' ']])('selects a route from the keyboard with %j', async (key) => {
    const props = renderResults(resultsWith({}))

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Route 1' })).toHaveFocus()
    await userEvent.tab()
    await userEvent.keyboard(key)

    expect(props.onSelectRoute).toHaveBeenCalledWith('route-b')
  })

  it('tells assistive technology which route is chosen', () => {
    renderResults(resultsWith({}), { selectedRouteId: 'route-b' })

    expect(screen.getByRole('button', { name: 'Route 1' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Route 2' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps cards at full strength when no route is recommended, so text stays readable', () => {
    const none: Recommendation = {
      status: 'none_eligible',
      route_id: null,
      least_bad_route_id: 'route-b',
      deciding_criterion: null,
      sentence: 'No route is safe enough to recommend.',
    }
    renderResults(resultsWith({ recommendation: none }))

    for (const card of screen.getAllByRole('article')) {
      expect(getComputedStyle(card).opacity).not.toBe('0.7')
    }
  })
})

describe('recommendation (REQ-07, RR-23, RR-26)', () => {
  it('badges the recommended route and shows the server sentence', () => {
    renderResults(resultsWith({}))

    expect(screen.getByText('Route 1 has the fewest Severe miles.')).toBeInTheDocument()
    expect(screen.getAllByText('Recommended')).toHaveLength(1)
  })

  it('says no route is recommended, why, and suggests leaving later (RR-23)', () => {
    const blocked = makeRoute('route-a', {
      rank: null,
      summary: { ...makeRoute('x').summary, eligible: false, ineligible_reason: 'no_travel' },
      checkpoints: [
        makeCheckpoint({ index: 0 }),
        makeCheckpoint({
          index: 1,
          distance_miles: '150',
          level: 'no_travel',
          driving_factors: ['wind'],
          measurements: { wind_mph: '58', rain_in_hr: '0.00', snow_in_hr: '0.00', gust_mph: '70' },
        }),
      ],
    })
    const sparse = summaryWith(makeRoute('route-b', { rank: null }), {
      eligible: false,
      ineligible_reason: 'not_enough_weather_data',
    })
    const none: Recommendation = {
      status: 'none_eligible',
      route_id: null,
      least_bad_route_id: 'route-b',
      deciding_criterion: null,
      sentence: 'No route is safe enough to recommend.',
    }
    renderResults(resultsWith({ routes: [blocked, sparse], recommendation: none }))

    expect(screen.getByText('No route is recommended')).toBeInTheDocument()
    expect(
      screen.getByText(/Route 1: No Travel at mile 150\. Wind of 58 mph sets the rating\./),
    ).toBeInTheDocument()
    expect(screen.getByText(/Route 2: not enough weather data/)).toBeInTheDocument()
    expect(screen.getByText('Least bad, for information only')).toBeInTheDocument()
    expect(screen.getByText(/Leaving later may help/)).toBeInTheDocument()
    expect(screen.queryByText('Recommended')).not.toBeInTheDocument()
  })

  it('marks routes that cannot be recommended (RR-22)', () => {
    const noTravel = summaryWith(makeRoute('route-a'), {
      ineligible_reason: 'no_travel',
      eligible: false,
    })
    const sparse = summaryWith(makeRoute('route-b'), {
      ineligible_reason: 'not_enough_weather_data',
      eligible: false,
    })
    renderResults(resultsWith({ routes: [noTravel, sparse] }))

    expect(screen.getByText('Contains No Travel')).toBeInTheDocument()
    expect(screen.getByText('Not enough weather data')).toBeInTheDocument()
  })
})

describe('states (REQ-10, REQ-12)', () => {
  it('shows placeholders for alternatives while only the primary route has arrived', () => {
    renderResults(
      resultsWith({ phase: 'partial', routes: [makeRoute('route-a')], recommendation: null }),
    )

    expect(screen.getByText(/Looking for alternative routes/)).toBeInTheDocument()
  })

  it('says alternatives are unavailable when compare failed', () => {
    renderResults(
      resultsWith({
        phase: 'partial',
        routes: [makeRoute('route-a')],
        alternativesUnavailable: true,
      }),
    )

    expect(screen.getByText(/Alternative routes are unavailable/)).toBeInTheDocument()
    expect(screen.queryByText(/Looking for alternative routes/)).not.toBeInTheDocument()
  })

  it('shows the backup routing notice', () => {
    renderResults(resultsWith({ routingProvider: 'valhalla' }))

    expect(screen.getByText(/Backup routing is in use/)).toBeInTheDocument()
  })

  it('shows the weather states in plain words', () => {
    renderResults(resultsWith({ weather: 'busy' }))

    expect(screen.getByText('Weather service busy, try again in a minute')).toBeInTheDocument()
  })

  it.each([
    ['partial', /Some checkpoints have no weather data/],
    ['unavailable', /Weather data is unavailable right now/],
  ] as const)('explains weather status %s (RR-11, RR-23)', (weather, message) => {
    renderResults(resultsWith({ weather }))

    expect(screen.getByText(message)).toBeInTheDocument()
  })

  it('says the server is waking up when the first request is slow', () => {
    renderResults({ ...EMPTY_RESULTS, phase: 'loading', isServerWaking: true })

    expect(screen.getByText(/The server is waking up/)).toBeInTheDocument()
  })

  it('shows a plain message and a retry button when both requests fail', async () => {
    const props = renderResults({
      ...EMPTY_RESULTS,
      phase: 'failed',
      error: new ApiError('no_route_found'),
    })

    expect(screen.getByText(/No truck route was found/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(props.onRetry).toHaveBeenCalledTimes(1)
  })

  it('states that arrival times are driving time only (RR-16, REQ-15)', () => {
    renderResults(resultsWith({}))

    expect(screen.getByText(/driving time only/)).toBeInTheDocument()
  })
})

describe('checkpoint details (REQ-08, RR-10)', () => {
  it('shows the readings, arrival and the driving factor of the chosen checkpoint', () => {
    const route = makeRoute('route-a')
    route.checkpoints = [
      makeCheckpoint({
        index: 3,
        distance_miles: '75',
        level: 'severe',
        driving_factors: ['wind'],
        load_rule: 'raised_to_severe',
        measurements: { wind_mph: '38', rain_in_hr: '0.10', snow_in_hr: null, gust_mph: '52' },
      }),
    ]
    renderResults(resultsWith({ routes: [route] }), { selectedCheckpointIndex: 3 })

    expect(screen.getByText('38 mph')).toBeInTheDocument()
    expect(screen.getByText('52 mph')).toBeInTheDocument()
    expect(screen.getByText('0.10 in/hr')).toBeInTheDocument()
    expect(screen.getByText('No reading')).toBeInTheDocument()
    expect(
      screen.getByText('Heavy load raises 38 mph wind from High to Severe.'),
    ).toBeInTheDocument()
  })

  it('reports a clicked checkpoint to the shell', async () => {
    const props = renderResults(resultsWith({}))

    await userEvent.click(screen.getByRole('button', { name: /Mile 25/ }))

    expect(props.onSelectCheckpoint).toHaveBeenCalledWith('route-a', 1)
  })

  it('lists checkpoints as list items and marks the chosen one', () => {
    renderResults(resultsWith({}), { selectedCheckpointIndex: 1 })

    const list = screen.getByRole('list', { name: 'Checkpoints' })
    const rows = within(list).getAllByRole('listitem')
    const buttons = within(list).getAllByRole('button')

    expect(rows.length).toBeGreaterThan(1)
    expect(buttons).toHaveLength(rows.length)
    expect(buttons[1]).toHaveAttribute('aria-current', 'true')
    expect(buttons[0]).not.toHaveAttribute('aria-current')
  })
})
