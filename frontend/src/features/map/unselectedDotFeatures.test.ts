import { describe, expect, it } from 'vitest'
import { NORTH_ROUTE, SOUTH_ROUTE, TWO_ROUTES } from './routeFixtures'
import { dotTier, unselectedDotFeatures } from './unselectedDotFeatures'

describe('dotTier thins the dots of routes that are not selected (REQ-08)', () => {
  it('keeps every 4th checkpoint in the first tier, so the sparsest view still follows the whole route', () => {
    const firstTier = Array.from({ length: 10 }, (_, position) => position).filter(
      (position) => dotTier(position, 9) === 0,
    )

    expect(firstTier).toEqual([0, 4, 8, 9])
  })

  it('always keeps the destination in the first tier, wherever it falls', () => {
    expect(dotTier(6, 6)).toBe(0)
    expect(dotTier(7, 7)).toBe(0)
  })

  it('puts the other even checkpoints in the second tier and the odd ones in the third', () => {
    expect([2, 6].map((position) => dotTier(position, 20))).toEqual([1, 1])
    expect([1, 3, 5, 7].map((position) => dotTier(position, 20))).toEqual([2, 2, 2, 2])
  })
})

describe('unselectedDotFeatures gives every route its checkpoints in the server risk colour (REQ-08, NFR-03)', () => {
  const dots = unselectedDotFeatures(TWO_ROUTES)

  it('has one dot per checkpoint of every route, so no route is left without dots', () => {
    const expected = NORTH_ROUTE.checkpoints.length + SOUTH_ROUTE.checkpoints.length

    expect(dots.features).toHaveLength(expected)
    expect(new Set(dots.features.map((dot) => dot.properties.routeId))).toEqual(
      new Set([NORTH_ROUTE.id, SOUTH_ROUTE.id]),
    )
  })

  it('carries each checkpoint level exactly as the server sent it', () => {
    const southLevels = dots.features
      .filter((dot) => dot.properties.routeId === SOUTH_ROUTE.id)
      .map((dot) => dot.properties.level)

    expect(southLevels).toEqual(SOUTH_ROUTE.checkpoints.map((checkpoint) => checkpoint.level))
  })

  it('places each dot at its checkpoint position, longitude first', () => {
    const first = dots.features[0]

    expect(first?.geometry.coordinates).toEqual([
      NORTH_ROUTE.checkpoints[0]?.position.lon,
      NORTH_ROUTE.checkpoints[0]?.position.lat,
    ])
  })

  it('gives each route its own tiers, ending with the destination in the first tier', () => {
    const southTiers = dots.features
      .filter((dot) => dot.properties.routeId === SOUTH_ROUTE.id)
      .map((dot) => dot.properties.tier)

    expect(southTiers.slice(0, 5)).toEqual([0, 2, 1, 2, 0])
    expect(southTiers.at(-1)).toBe(0)
  })

  it('has no dots when there are no routes', () => {
    expect(unselectedDotFeatures([]).features).toEqual([])
  })
})
