import { describe, expect, it } from 'vitest'
import { ARROW_IMAGE_ID } from './directionArrowImage'
import { arrowSpacingPx, directionCueLayerProps } from './directionCue'

const SPACING = 100
const FITTED_ROUTE_SHARE_OF_WIDTH = 0.75

describe('the direction cue shows a driver which way the selected route runs (REQ-08, FE-08)', () => {
  it('draws only the selected route', () => {
    expect(directionCueLayerProps('route-2', SPACING).filter).toEqual([
      '==',
      ['get', 'routeId'],
      'route-2',
    ])
  })

  it('draws nothing while no route is selected', () => {
    expect(directionCueLayerProps(null, SPACING).filter).toEqual(['==', ['get', 'routeId'], ''])
  })

  it('is a symbol layer drawing the registered arrow image, with a stable id', () => {
    const layer = directionCueLayerProps('route-1', SPACING)

    expect(layer.type).toBe('symbol')
    expect(layer.id).toBe('route-direction')
    expect(layer.layout['icon-image']).toBe(ARROW_IMAGE_ID)
  })

  it('places arrows along the line, never turned back to read upright, so they point from A to B', () => {
    const { layout } = directionCueLayerProps('route-1', SPACING)

    expect(layout['symbol-placement']).toBe('line')
    expect(layout['icon-rotation-alignment']).toBe('map')
    expect(layout['icon-keep-upright']).toBe(false)
  })

  it('keeps every arrow on screen however many dot icons and labels are in the way', () => {
    const { layout } = directionCueLayerProps('route-1', SPACING)

    expect(layout['icon-allow-overlap']).toBe(true)
    expect(layout['icon-ignore-placement']).toBe(true)
  })

  it('sits beside the line so the checkpoint dots on it never cover it', () => {
    const [, sideways] = directionCueLayerProps('route-1', SPACING).layout['icon-offset']

    expect(Math.abs(sideways)).toBeGreaterThanOrEqual(16)
  })

  it('is bright but not solid', () => {
    const opacity = directionCueLayerProps('route-1', SPACING).paint['icon-opacity']

    expect(opacity).toBeGreaterThanOrEqual(0.8)
    expect(opacity).toBeLessThan(1)
  })

  it('spaces the arrows by the gap it is given', () => {
    expect(directionCueLayerProps('route-1', 87).layout['symbol-spacing']).toBe(87)
  })
})

describe('the arrow gap keeps 5 to 8 arrows along a route fitted to the map (REQ-08)', () => {
  it.each([320, 390, 600, 760, 900, 1200, 1600])(
    'gives a route as long as a %i px map between 5 and 8 arrows',
    (mapWidth) => {
      const arrows = (FITTED_ROUTE_SHARE_OF_WIDTH * mapWidth) / arrowSpacingPx(mapWidth)

      expect(arrows).toBeGreaterThanOrEqual(5)
      expect(arrows).toBeLessThanOrEqual(8)
    },
  )

  it('is a tenth of the map width between the floor and the ceiling', () => {
    expect(arrowSpacingPx(600)).toBe(60)
  })

  it('never crowds a tiny map or leaves a huge one bare', () => {
    expect(arrowSpacingPx(100)).toBe(40)
    expect(arrowSpacingPx(4000)).toBe(150)
  })

  it('is a whole number of pixels', () => {
    expect(Number.isInteger(arrowSpacingPx(777))).toBe(true)
  })
})
