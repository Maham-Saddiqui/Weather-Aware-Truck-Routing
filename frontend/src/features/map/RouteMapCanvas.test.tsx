import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteMapProps } from '../../shared/types'
import { RouteMapCanvas } from './RouteMapCanvas'
import { TWO_ROUTES } from './routeFixtures'

interface MapStubProps {
  children: ReactNode
  onClick: (event: unknown) => void
  onLoad: () => void
  onError: (event: object | null) => void
  interactiveLayerIds: string[]
}

const mapProps = vi.hoisted(() => ({ current: null as MapStubProps | null }))

vi.mock('./mapLib', () => ({ mapLib: Promise.resolve({}) }))
vi.mock('./RouteScene', () => ({ RouteScene: () => null }))
vi.mock('./HeatmapLayer', () => ({ HeatmapLayer: () => null }))
vi.mock('@vis.gl/react-maplibre', () => ({
  Map: (props: MapStubProps) => {
    mapProps.current = props
    return <div>{props.children}</div>
  },
  AttributionControl: () => null,
  NavigationControl: () => null,
}))

const onSelectRoute = vi.fn()

function renderCanvas(overrides: Partial<RouteMapProps> = {}) {
  render(
    <RouteMapCanvas
      routes={TWO_ROUTES}
      selectedRouteId="route-north"
      selectedCheckpointIndex={null}
      heatmap={null}
      hourOffset={0}
      onSelectRoute={onSelectRoute}
      onSelectCheckpoint={vi.fn()}
      {...overrides}
    />,
  )
}

function clickOn(target: Element, routeId?: string) {
  const features = routeId === undefined ? [] : [{ properties: { routeId } }]
  act(() => {
    mapProps.current?.onClick({ features, originalEvent: { target } })
  })
}

beforeEach(() => {
  onSelectRoute.mockClear()
})

describe('RouteMapCanvas (REQ-08: click a route line to select it)', () => {
  it('asks to select the route whose line was clicked', () => {
    renderCanvas()

    clickOn(document.body, 'route-south')

    expect(onSelectRoute).toHaveBeenCalledWith('route-south')
  })

  it('only listens to clicks on the route lines', () => {
    renderCanvas()

    expect(mapProps.current?.interactiveLayerIds).toEqual(['route-hit'])
  })

  it('ignores a click that lands on a checkpoint marker lying on the line', () => {
    renderCanvas()
    const marker = document.body.appendChild(document.createElement('div'))
    marker.className = 'maplibregl-marker'

    clickOn(marker, 'route-south')

    expect(onSelectRoute).not.toHaveBeenCalled()
  })

  it('ignores a click on empty map', () => {
    renderCanvas()

    clickOn(document.body)

    expect(onSelectRoute).not.toHaveBeenCalled()
  })
})

describe('RouteMapCanvas legend and failure (FE-09, REQ-09)', () => {
  it('shows the legend even when there is no heatmap', () => {
    renderCanvas()

    expect(screen.getByRole('region', { name: 'Risk legend' })).toBeVisible()
  })

  it('shows a plain message, keeping the legend, when the map could not be created', () => {
    renderCanvas()

    act(() => {
      mapProps.current?.onError({ type: 'error', target: null, error: new Error('no WebGL') })
    })

    expect(screen.getByRole('alert')).toHaveTextContent('The map could not load')
    expect(screen.getByRole('region', { name: 'Risk legend' })).toBeVisible()
  })

  it('shows the plain message when the basemap style itself cannot be loaded', () => {
    renderCanvas()

    act(() => {
      mapProps.current?.onError({ type: 'error', error: new Error('style request failed') })
    })

    expect(screen.getByRole('alert')).toHaveTextContent('The map could not load')
  })

  it('keeps the map when a single tile fails to load, before or after the first load', () => {
    renderCanvas()
    const tileError = { type: 'error', sourceId: 'basemap', tile: {}, error: new Error('404') }

    act(() => {
      mapProps.current?.onError(tileError)
    })
    act(() => {
      mapProps.current?.onLoad()
    })
    act(() => {
      mapProps.current?.onError({ type: 'error', error: new Error('late sprite failure') })
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
