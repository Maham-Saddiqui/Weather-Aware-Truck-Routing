import { describe, expect, it } from 'vitest'
import { lineMidpoint } from './lineMidpoint'

describe('lineMidpoint places a route name half way along its line (REQ-08)', () => {
  it('is the middle of a straight line', () => {
    expect(
      lineMidpoint([
        [0, 0],
        [2, 0],
      ]),
    ).toEqual([1, 0])
  })

  it('goes by length along the line, not by the number of points', () => {
    const [longitude, latitude] =
      lineMidpoint([
        [0, 0],
        [0.1, 0],
        [0.2, 0],
        [4, 0],
      ]) ?? []

    expect(latitude).toBe(0)
    expect(longitude).toBeCloseTo(2, 1)
  })

  it('follows a bend: the middle of an L is its corner', () => {
    expect(
      lineMidpoint([
        [0, 0],
        [0, 1],
        [0, 2],
      ]),
    ).toEqual([0, 1])
  })

  it('has no midpoint for an empty line and the point itself for a single point', () => {
    expect(lineMidpoint([])).toBeNull()
    expect(lineMidpoint([[5, 6]])).toEqual([5, 6])
  })
})
