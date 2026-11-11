import { describe, expect, it } from 'vitest'
import { makeCheckpoint, makeHeatmap, makeRoute } from '../shared/testing/fixtures'
import { playUntilHour } from './playUntilHour'

const DEPARTURE = '2026-11-12T14:00:00Z'
const HEATMAP = makeHeatmap([{ position: { lat: 40, lon: -100 }, risk: '0'.repeat(49) }], DEPARTURE)

function tripOf(hoursToArrive: number) {
  const arrival = new Date(Date.parse(DEPARTURE) + hoursToArrive * 3_600_000).toISOString()
  return makeRoute('route-a', {
    checkpoints: [
      makeCheckpoint({ eta_utc: DEPARTURE }),
      makeCheckpoint({ index: 1, eta_utc: arrival }),
    ],
  })
}

describe('playUntilHour ends Play one hour after the truck arrives (REQ-09, RR-19, RR-28)', () => {
  it('is hour 3 for a trip of 2 hours', () => {
    expect(playUntilHour(tripOf(2), HEATMAP)).toBe(3)
  })

  it('rounds a part hour up before adding the extra hour', () => {
    expect(playUntilHour(tripOf(20.2), HEATMAP)).toBe(22)
  })

  it('is hour 21 for a trip of 20 hours', () => {
    expect(playUntilHour(tripOf(20), HEATMAP)).toBe(21)
  })

  it('stops at the slider last hour for a trip longer than the forecast', () => {
    expect(playUntilHour(tripOf(60), HEATMAP)).toBe(48)
    expect(playUntilHour(tripOf(48), HEATMAP)).toBe(48)
  })

  it('changes with the selected route', () => {
    expect(playUntilHour(tripOf(5), HEATMAP)).not.toBe(playUntilHour(tripOf(9), HEATMAP))
  })

  it('plays the whole forecast when the route has no checkpoints', () => {
    expect(playUntilHour(makeRoute('route-a', { checkpoints: [] }), HEATMAP)).toBe(48)
  })
})
