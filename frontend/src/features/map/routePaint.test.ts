import { describe, expect, it } from 'vitest'
import { casingPaint, linePaint, OTHER_ROUTE, SELECTED_ROUTE, selectedOnTop } from './routePaint'

const HUES = ['#111111', '#222222', '#333333'] as const

describe('the selected route dominates the others on the map (REQ-08, FE-15)', () => {
  it('draws the selected line wider than the others, and the others thinner than the selected casing', () => {
    expect(SELECTED_ROUTE.linePx).toBeGreaterThanOrEqual(2 * OTHER_ROUTE.linePx)
    expect(SELECTED_ROUTE.casingPx).toBeGreaterThan(SELECTED_ROUTE.linePx)
    expect(OTHER_ROUTE.casingPx).toBeGreaterThan(OTHER_ROUTE.linePx)
  })

  it('draws the selected line solid and the others clearly fainter but still visible', () => {
    expect(SELECTED_ROUTE.opacity).toBe(1)
    expect(OTHER_ROUTE.opacity).toBeLessThanOrEqual(0.7)
    expect(OTHER_ROUTE.opacity).toBeGreaterThanOrEqual(0.4)
  })

  it('picks width and opacity by whether the feature is the selected route', () => {
    const paint = linePaint('route-2', HUES)

    expect(paint['line-width']).toEqual([
      'case',
      ['==', ['get', 'routeId'], 'route-2'],
      SELECTED_ROUTE.linePx,
      OTHER_ROUTE.linePx,
    ])
    expect(paint['line-opacity']).toEqual([
      'case',
      ['==', ['get', 'routeId'], 'route-2'],
      SELECTED_ROUTE.opacity,
      OTHER_ROUTE.opacity,
    ])
  })

  it('fades the dark casing with its line, so it never outlines a faint line in solid dark', () => {
    expect(casingPaint('route-1')['line-opacity']).toEqual(
      linePaint('route-1', HUES)['line-opacity'],
    )
  })

  it('keeps each position hue whichever route is selected', () => {
    expect(linePaint('route-1', HUES)['line-color']).toEqual(
      linePaint('route-3', HUES)['line-color'],
    )
    expect(linePaint('route-1', HUES)['line-color']).toEqual([
      'match',
      ['get', 'position'],
      0,
      '#111111',
      1,
      '#222222',
      '#333333',
    ])
  })

  it('sorts the selected route above the others', () => {
    expect(selectedOnTop('route-1')['line-sort-key']).toEqual([
      'case',
      ['==', ['get', 'routeId'], 'route-1'],
      1,
      0,
    ])
  })
})
