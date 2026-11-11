import { describe, expect, it } from 'vitest'
import { pointAlong } from './pointAlong'

describe('pointAlong places a route name along its line (REQ-08)', () => {
  it('is the middle of a straight line', () => {
    expect(
      pointAlong(
        [
          [0, 0],
          [2, 0],
        ],
        0.5,
      ),
    ).toEqual([1, 0])
  })

  it('goes by length along the line, not by the number of points', () => {
    const [longitude, latitude] =
      pointAlong(
        [
          [0, 0],
          [0.1, 0],
          [0.2, 0],
          [4, 0],
        ],
        0.5,
      ) ?? []

    expect(latitude).toBe(0)
    expect(longitude).toBeCloseTo(2, 1)
  })

  it('follows a bend: the middle of an L is its corner', () => {
    expect(
      pointAlong(
        [
          [0, 0],
          [0, 1],
          [0, 2],
        ],
        0.5,
      ),
    ).toEqual([0, 1])
  })

  it('has no point along for an empty line and the point itself for a single point', () => {
    expect(pointAlong([], 0.5)).toBeNull()
    expect(pointAlong([[5, 6]], 0.5)).toEqual([5, 6])
  })

  it('finds a point at any share of the length', () => {
    expect(
      pointAlong(
        [
          [0, 0],
          [4, 0],
        ],
        0.25,
      ),
    ).toEqual([1, 0])
  })
})
