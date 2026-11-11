import { describe, expect, it } from 'vitest'
import { RISK_COLOURS } from '../../shared/colours'
import { makeHeatmapOfRisks } from '../../shared/testing/fixtures'
import { circleFillForHour, heatmapFeatures, levelForDigit, riskDigitAt } from './heatmapPaint'

describe('riskDigitAt (RR-28: character h of the risk string is departure + h hours)', () => {
  it('reads character h of the string for slider position h', () => {
    expect(riskDigitAt('0123x', 0)).toBe('0')
    expect(riskDigitAt('0123x', 3)).toBe('3')
  })

  it('returns x for an hour that has no data', () => {
    expect(riskDigitAt('0123x', 4)).toBe('x')
  })

  it('returns an empty text beyond the end of the string', () => {
    expect(riskDigitAt('012', 7)).toBe('')
  })
})

describe('levelForDigit (RR-01: the server digit names the level, x is no level)', () => {
  it.each([
    ['0', 'low'],
    ['1', 'moderate'],
    ['2', 'high'],
    ['3', 'severe'],
    ['4', 'no_travel'],
  ])('maps digit %s to %s', (digit, level) => {
    expect(levelForDigit(digit)).toBe(level)
  })

  it('gives no level for x, an empty text or anything else', () => {
    expect(levelForDigit('x')).toBeNull()
    expect(levelForDigit('')).toBeNull()
  })
})

describe('circleFillForHour (FE-09: colour shows the risk level, Low is a faint tint)', () => {
  it('takes character h of the point risk string and matches it to one fill per level', () => {
    const expression = circleFillForHour(6)

    expect(expression.slice(0, 2)).toEqual(['match', ['slice', ['get', 'risk'], 6, 7]])
  })

  it('draws Low as a faint tint of the shared Low green, about 12 percent (FE-09, REQ-09)', () => {
    const [, , lowDigit, lowFill] = circleFillForHour(0)
    const opacity = parseInt(String(lowFill).slice(-2), 16) / 0xff

    expect(lowDigit).toBe('0')
    expect(String(lowFill).slice(0, 7)).toBe(RISK_COLOURS.low)
    expect(opacity).toBeGreaterThan(0.1)
    expect(opacity).toBeLessThan(0.15)
  })

  it('makes every higher level more opaque than Low, so only risky stretches glow (FE-09, RR-28)', () => {
    const [, , , lowFill, , moderateFill, , highFill, , severeFill, , noTravelFill] =
      circleFillForHour(0)

    const opacities = [lowFill, moderateFill, highFill, severeFill, noTravelFill].map((fill) =>
      parseInt(String(fill).slice(-2), 16),
    )
    expect(opacities).toEqual([...opacities].sort((a, b) => a - b))
    expect(new Set(opacities).size).toBe(opacities.length)
    expect(opacities[1]).toBeGreaterThanOrEqual((opacities[0] ?? 0) * 3)
  })

  it('gives each level its own colour so packed points never change the hue', () => {
    const fills = circleFillForHour(0).filter((_, index) => index > 2 && index % 2 === 1)

    expect(new Set(fills).size).toBe(fills.length)
  })

  it('draws no data in the neutral grey at a clearly visible opacity, far above the faint Low tint (RR-11)', () => {
    const expression = circleFillForHour(0)
    const noDataFill = String(expression.at(-1))
    const visibleFloor = 0x66

    expect(noDataFill.slice(0, 7)).toBe(RISK_COLOURS.no_data)
    expect(parseInt(noDataFill.slice(-2), 16)).toBeGreaterThanOrEqual(visibleFloor)
    expect(noDataFill).not.toBe(String(expression[3]))
  })
})

describe('heatmapFeatures (RR-28: one list per response, drawn as it came)', () => {
  it('keeps one feature per server point with its risk string and longitude first', () => {
    const { features } = heatmapFeatures(makeHeatmapOfRisks('012', '340'))

    expect(features).toHaveLength(2)
    expect(features[1]?.properties.risk).toBe('340')
    expect(features[1]?.geometry.coordinates).toEqual([-99, 40])
  })
})
