import { describe, expect, it } from 'vitest'
import { LEVEL_ICONS, LEVEL_LABELS, LEVEL_ORDER } from './risk'
import { RISK_COLOURS } from './colours'

describe('one risk scale for the panel and the map (FE-09, RR-21)', () => {
  it('gives every level its own word, icon and colour so none can be mistaken for another', () => {
    expect(new Set(LEVEL_ORDER.map((level) => LEVEL_LABELS[level])).size).toBe(LEVEL_ORDER.length)
    expect(new Set(LEVEL_ORDER.map((level) => LEVEL_ICONS[level])).size).toBe(LEVEL_ORDER.length)
    expect(new Set(LEVEL_ORDER.map((level) => RISK_COLOURS[level])).size).toBe(LEVEL_ORDER.length)
  })

  it('lists the levels from Low to No Travel with No data last', () => {
    expect(LEVEL_ORDER.map((level) => LEVEL_LABELS[level])).toEqual([
      'Low',
      'Moderate',
      'High',
      'Severe',
      'No Travel',
      'No data',
    ])
  })
})
