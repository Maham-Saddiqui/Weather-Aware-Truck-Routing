import { describe, expect, it } from 'vitest'
import { directionCueLayerProps } from './directionCue'

const WHITE = '#abcdef'

describe('the direction cue shows a driver which way the selected route runs (REQ-08, FE-08)', () => {
  it('draws only the selected route', () => {
    expect(directionCueLayerProps('route-2', WHITE).filter).toEqual([
      '==',
      ['get', 'routeId'],
      'route-2',
    ])
  })

  it('draws nothing while no route is selected', () => {
    expect(directionCueLayerProps(null, WHITE).filter).toEqual(['==', ['get', 'routeId'], ''])
  })

  it('is a symbol layer with a stable id, so it can sit between the route line and its click layer', () => {
    const layer = directionCueLayerProps('route-1', WHITE)

    expect(layer.type).toBe('symbol')
    expect(layer.id).toBe('route-direction')
  })

  it('places arrows along the line, never turned back to read upright, so they point from A to B', () => {
    const { layout } = directionCueLayerProps('route-1', WHITE)

    expect(layout['symbol-placement']).toBe('line')
    expect(layout['text-keep-upright']).toBe(false)
  })

  it('keeps every arrow on screen and clear of the map labels', () => {
    const { layout } = directionCueLayerProps('route-1', WHITE)

    expect(layout['text-allow-overlap']).toBe(true)
    expect(layout['text-ignore-placement']).toBe(true)
  })

  it('spaces the arrows further apart as the map zooms in', () => {
    expect(directionCueLayerProps('route-1', WHITE).layout['symbol-spacing']).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      4,
      70,
      10,
      140,
    ])
  })

  it('uses the font the basemap serves, so no glyph file is requested in vain', () => {
    expect(directionCueLayerProps('route-1', WHITE).layout['text-font']).toEqual([
      'Noto Sans Regular',
    ])
  })

  it('is faint but visible, in the colour it is given', () => {
    const { paint } = directionCueLayerProps('route-1', WHITE)

    expect(paint['text-color']).toBe(WHITE)
    expect(paint['text-opacity']).toBeGreaterThan(0.4)
    expect(paint['text-opacity']).toBeLessThan(1)
  })
})
