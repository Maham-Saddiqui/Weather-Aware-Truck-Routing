import { describe, expect, it } from 'vitest'
import { isDotDrawn, meanSpacingPx, strideForSpacing } from './dotThinning'

describe('thinning checkpoint dots by how far apart they are on screen (REQ-08)', () => {
  it('measures the mean distance between neighbours along the route', () => {
    expect(
      meanSpacingPx([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: 3, y: 14 },
      ]),
    ).toBe(7.5)
  })

  it('has no spacing for fewer than two points, so nothing is thinned', () => {
    expect(strideForSpacing(meanSpacingPx([{ x: 0, y: 0 }]))).toBe(1)
  })

  it.each([
    [60, 1],
    [30, 1],
    [29, 2],
    [15, 2],
    [14, 4],
    [7, 8],
    [1, 8],
  ])('at %i px between dots it draws every %ith checkpoint', (spacingPx, stride) => {
    expect(strideForSpacing(spacingPx)).toBe(stride)
  })

  it('draws the selected checkpoint and both ends whatever the stride', () => {
    const draws = (position: number, isSelected = false) =>
      isDotDrawn({ position, lastPosition: 10, stride: 4, isSelected })

    expect([0, 1, 4, 5, 8, 10].map((position) => draws(position))).toEqual([
      true,
      false,
      true,
      false,
      true,
      true,
    ])
    expect(draws(5, true)).toBe(true)
  })
})
