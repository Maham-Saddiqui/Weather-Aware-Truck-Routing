import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TWO_ROUTES } from '../features/map/routeFixtures'
import { EMPTY_RESULTS } from '../features/route-results/tripResults'
import { MapPane } from './MapPane'

const canvas = vi.hoisted(() => ({ shouldFail: false }))

vi.mock('../features/map/RouteMapCanvas', () => ({
  RouteMapCanvas: () => {
    if (canvas.shouldFail) {
      throw new Error('the map library did not load')
    }
    return <div role="img" aria-label="The loaded map" />
  },
}))

const planner = {
  run: null,
  results: { ...EMPTY_RESULTS, routes: TWO_ROUTES },
  selectedRouteId: null,
  selectedCheckpointIndex: null,
  selectRoute: vi.fn(),
  selectCheckpoint: vi.fn(),
}

afterEach(() => {
  canvas.shouldFail = false
})

describe('MapPane (FE-08, FE-11: the map loads lazily and may fail without hurting the page)', () => {
  it('shows the map once its chunk has loaded', async () => {
    render(<MapPane planner={planner} hourOffset={0} />)

    expect(await screen.findByRole('img', { name: 'The loaded map' })).toBeVisible()
  })

  it('shows a plain message when the map cannot load', async () => {
    canvas.shouldFail = true
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<MapPane planner={planner} hourOffset={0} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The map could not load. Your routes and weather ratings are still listed next to it.',
    )
  })
})
