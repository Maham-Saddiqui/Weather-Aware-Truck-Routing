import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LABEL_HALO_COLOUR, LABEL_TEXT_COLOUR } from './mapConstants'
import { ReadableLabels, brightenLabels } from './ReadableLabels'

const STYLE = {
  layers: [
    { id: 'background', type: 'background' },
    { id: 'road', type: 'line', layout: {} },
    { id: 'place_city', type: 'symbol', layout: { 'text-field': '{name}' } },
    { id: 'poi_icon', type: 'symbol', layout: { 'icon-image': 'circle-11' } },
    { id: 'water_name', type: 'symbol', layout: { 'text-field': '{name}' } },
  ],
}

interface StubStyle {
  layers?: { id: string; type: string; layout?: Record<string, unknown> }[]
}

function stubMap(style: StubStyle | null = STYLE) {
  const painted: [string, string, string | number][] = []
  const listeners = new Map<string, () => void>()
  const map = {
    painted,
    listeners,
    isStyleLoaded: vi.fn(() => false),
    getStyle: () => style ?? undefined,
    setPaintProperty: (id: string, name: string, value: string | number) =>
      painted.push([id, name, value]),
    on: (event: string, handler: () => void) => listeners.set(event, handler),
    off: (event: string) => listeners.delete(event),
    getMap: () => map,
  }
  return map
}

const mapHolder = vi.hoisted(() => ({
  current: undefined as { getMap: () => unknown } | undefined,
}))

vi.mock('@vis.gl/react-maplibre', () => ({ useMap: () => ({ current: mapHolder.current }) }))

describe('readable basemap labels (NFR-03: legible map)', () => {
  it('lifts the text colour and halo of every label layer and nothing else', () => {
    const map = stubMap()

    brightenLabels(map)

    expect(map.painted.map(([id]) => id)).toEqual([
      'place_city',
      'place_city',
      'place_city',
      'water_name',
      'water_name',
      'water_name',
    ])
    expect(map.painted).toContainEqual(['place_city', 'text-color', LABEL_TEXT_COLOUR])
    expect(map.painted).toContainEqual(['place_city', 'text-halo-color', LABEL_HALO_COLOUR])
  })

  it('does nothing and does not fail when the style has no layers or is not there', () => {
    const none = stubMap(null)
    const empty = stubMap({})

    brightenLabels(none)
    brightenLabels(empty)

    expect(none.painted).toHaveLength(0)
    expect(empty.painted).toHaveLength(0)
  })

  it('waits for the style to load, then applies, and stops listening when removed', () => {
    const map = stubMap()
    mapHolder.current = map
    const { unmount } = render(<ReadableLabels />)
    expect(map.painted).toHaveLength(0)

    map.listeners.get('style.load')?.()
    expect(map.painted.length).toBeGreaterThan(0)

    unmount()
    expect(map.listeners.has('style.load')).toBe(false)
  })

  it('applies at once when the style is already loaded', () => {
    const map = stubMap()
    map.isStyleLoaded.mockReturnValue(true)
    mapHolder.current = map

    render(<ReadableLabels />)

    expect(map.painted.length).toBeGreaterThan(0)
  })
})
