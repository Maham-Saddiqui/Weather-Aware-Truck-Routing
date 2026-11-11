import { describe, expect, it } from 'vitest'
import type { Heatmap } from '../../shared/types'
import { circleFillForHour, heatmapFeatures, riskDigitAt, worstLevelAtHour } from './heatmapPaint'

const START_UTC = '2026-11-12T13:00:00Z'

function heatmapOf(...risks: string[]): Heatmap {
  return {
    start_utc: START_UTC,
    hours: 49,
    points: risks.map((risk, index) => ({ position: { lat: 40, lon: -100 + index }, risk })),
  }
}

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

describe('worstLevelAtHour (RR-01: worst of is the maximum and no data is not a level)', () => {
  it('picks the worst level among the points at that hour', () => {
    expect(worstLevelAtHour(heatmapOf('0100', '0300', '0000'), 1)).toBe('severe')
    expect(worstLevelAtHour(heatmapOf('0100', '0300', '0000'), 2)).toBe('low')
  })

  it('never lets no data count as a level, even when it is all there is', () => {
    expect(worstLevelAtHour(heatmapOf('2xx', 'x1x'), 0)).toBe('high')
    expect(worstLevelAtHour(heatmapOf('2xx', 'x1x'), 1)).toBe('moderate')
    expect(worstLevelAtHour(heatmapOf('2xx', 'xxx'), 2)).toBeNull()
  })

  it('reports no level for a heatmap without points', () => {
    expect(worstLevelAtHour(heatmapOf(), 0)).toBeNull()
  })
})

describe('circleFillForHour (FE-09: colour shows the risk level, Low is invisible)', () => {
  it('takes character h of the point risk string and matches it to one fill per level', () => {
    const expression = circleFillForHour(6)

    expect(expression.slice(0, 2)).toEqual(['match', ['slice', ['get', 'risk'], 6, 7]])
  })

  it('draws Low fully transparent and every higher level with a more opaque fill', () => {
    const [, , lowDigit, lowFill, , moderateFill, , highFill, , severeFill, , noTravelFill] =
      circleFillForHour(0)

    expect(lowDigit).toBe('0')
    expect(lowFill).toBe('#00000000')
    const opacities = [moderateFill, highFill, severeFill, noTravelFill].map((fill) =>
      parseInt(String(fill).slice(-2), 16),
    )
    expect(opacities).toEqual([...opacities].sort((a, b) => a - b))
    expect(Math.min(...opacities)).toBeGreaterThan(0)
  })

  it('gives each level its own colour so packed points never change the hue', () => {
    const fills = circleFillForHour(0).filter((_, index) => index > 2 && index % 2 === 1)

    expect(new Set(fills).size).toBe(fills.length)
  })

  it('has a fallback fill for no data that is fainter than Moderate', () => {
    const expression = circleFillForHour(0)

    expect(String(expression.at(-1)).slice(-2)).toBe('1f')
  })
})

describe('heatmapFeatures (RR-28: one list per response, drawn as it came)', () => {
  it('keeps one feature per server point with its risk string and longitude first', () => {
    const { features } = heatmapFeatures(heatmapOf('012', '340'))

    expect(features).toHaveLength(2)
    expect(features[1]?.properties.risk).toBe('340')
    expect(features[1]?.geometry.coordinates).toEqual([-99, 40])
  })
})
