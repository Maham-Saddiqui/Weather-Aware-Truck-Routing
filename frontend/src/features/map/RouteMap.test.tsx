import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouteMap } from './RouteMap'
import { TWO_ROUTES } from './routeFixtures'
import type { RouteMapProps } from '../../shared/types'

const canvas = vi.hoisted(() => ({ shouldFail: false }))

vi.mock('./RouteMapCanvas', () => ({
  RouteMapCanvas: () => {
    if (canvas.shouldFail) {
      throw new Error('the map library did not load')
    }
    return <div role="img" aria-label="The loaded map" />
  },
}))

const props: RouteMapProps = {
  routes: TWO_ROUTES,
  selectedRouteId: null,
  selectedCheckpointIndex: null,
  heatmap: null,
  hourOffset: 0,
  onSelectRoute: vi.fn(),
  onSelectCheckpoint: vi.fn(),
}

afterEach(() => {
  canvas.shouldFail = false
})

describe('RouteMap (FE-08, FE-11: the map loads lazily and may fail without hurting the page)', () => {
  it('shows the map once its chunk has loaded', async () => {
    render(<RouteMap {...props} />)

    expect(await screen.findByRole('img', { name: 'The loaded map' })).toBeVisible()
  })

  it('shows a plain message when the map cannot load', async () => {
    canvas.shouldFail = true
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<RouteMap {...props} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The map could not load. Your routes and weather ratings are still listed next to it.',
    )
  })
})
