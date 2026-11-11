import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RISK_COLOURS } from '../../shared/colours'
import { TWO_ROUTES } from './routeFixtures'
import { UnselectedRouteDots } from './UnselectedRouteDots'

interface LayerStubProps {
  id: string
  minzoom: number
  filter: unknown[]
  paint: Record<string, unknown>
}

const stubs = vi.hoisted(() => ({
  layers: [] as LayerStubProps[],
  source: null as { id: string; data: { features: unknown[] } } | null,
}))

vi.mock('@vis.gl/react-maplibre', () => ({
  Source: (props: { id: string; data: { features: unknown[] }; children: ReactNode }) => {
    stubs.source = props
    return <>{props.children}</>
  },
  Layer: (props: LayerStubProps) => {
    stubs.layers.push(props)
    return null
  },
}))

beforeEach(() => {
  stubs.layers = []
  stubs.source = null
})

describe('UnselectedRouteDots (REQ-08, NFR-03: every route shows where its risk sits)', () => {
  it('draws the dots in three layers that appear one after the other as the map zooms in', () => {
    render(<UnselectedRouteDots routes={TWO_ROUTES} selectedRouteId="route-north" />)

    expect(stubs.layers.map((layer) => layer.minzoom)).toEqual([0, 6, 7])
    expect(new Set(stubs.layers.map((layer) => layer.id)).size).toBe(3)
  })

  it('leaves the selected route out, since its own full-size markers are drawn instead', () => {
    render(<UnselectedRouteDots routes={TWO_ROUTES} selectedRouteId="route-north" />)

    expect(stubs.layers[0]?.filter).toEqual([
      'all',
      ['==', ['get', 'tier'], 0],
      ['!=', ['get', 'routeId'], 'route-north'],
    ])
  })

  it('draws every route while none is selected', () => {
    render(<UnselectedRouteDots routes={TWO_ROUTES} selectedRouteId={null} />)

    expect(stubs.layers[2]?.filter).toEqual([
      'all',
      ['==', ['get', 'tier'], 2],
      ['!=', ['get', 'routeId'], ''],
    ])
  })

  it('colours each dot from the one risk scale, falling back to the no-data grey', () => {
    render(<UnselectedRouteDots routes={TWO_ROUTES} selectedRouteId="route-north" />)

    expect(stubs.layers[0]?.paint['circle-color']).toEqual([
      'match',
      ['get', 'level'],
      'low',
      RISK_COLOURS.low,
      'moderate',
      RISK_COLOURS.moderate,
      'high',
      RISK_COLOURS.high,
      'severe',
      RISK_COLOURS.severe,
      'no_travel',
      RISK_COLOURS.no_travel,
      RISK_COLOURS.no_data,
    ])
  })

  it('hands the source the dots of every route, so selecting another route redraws nothing but the filter', () => {
    const { rerender } = render(
      <UnselectedRouteDots routes={TWO_ROUTES} selectedRouteId="route-north" />,
    )
    const dotsBefore = stubs.source?.data

    rerender(<UnselectedRouteDots routes={TWO_ROUTES} selectedRouteId="route-south" />)

    expect(stubs.source?.data).toBe(dotsBefore)
    expect(stubs.layers.at(-3)?.filter).toEqual([
      'all',
      ['==', ['get', 'tier'], 0],
      ['!=', ['get', 'routeId'], 'route-south'],
    ])
  })
})
