import { describe, expect, it } from 'vitest'
import type { Checkpoint } from '../../shared/types'
import { truckPositionAt } from './truckPosition'

function checkpointAt(index: number, lat: number, lon: number, etaUtc: string): Checkpoint {
  return {
    index,
    distance_miles: '0.0',
    covered_miles: '25.0',
    position: { lat, lon },
    eta_utc: etaUtc,
    time_zone: 'America/Chicago',
    measurements: { wind_mph: '12', rain_in_hr: '0.00', snow_in_hr: '0.0', gust_mph: '20' },
    level: 'low',
    driving_factors: [],
    load_rule: 'none',
  }
}

const ORIGIN = checkpointAt(0, 40, -100, '2026-11-12T13:00:00Z')
const MIDDLE = checkpointAt(1, 41, -98, '2026-11-12T15:00:00Z')
const DESTINATION = checkpointAt(2, 42, -96, '2026-11-12T19:00:00Z')
const ROUTE = [ORIGIN, MIDDLE, DESTINATION]

function at(isoInstant: string, checkpoints: readonly Checkpoint[] = ROUTE) {
  return truckPositionAt(checkpoints, Date.parse(isoInstant))
}

describe('truckPositionAt follows the slider time along the selected route (REQ-09, RR-28)', () => {
  it('sits at the origin before the first ETA', () => {
    expect(at('2026-11-12T10:00:00Z')).toEqual({ position: ORIGIN.position, hasArrived: false })
  })

  it('sits exactly on a checkpoint at that checkpoint ETA', () => {
    expect(at('2026-11-12T15:00:00Z')).toEqual({ position: MIDDLE.position, hasArrived: false })
  })

  it('is halfway between two checkpoints halfway between their ETAs', () => {
    expect(at('2026-11-12T14:00:00Z')?.position).toEqual({ lat: 40.5, lon: -99 })
    expect(at('2026-11-12T17:00:00Z')?.position).toEqual({ lat: 41.5, lon: -97 })
  })

  it('sits at the destination, arrived, from the last ETA on', () => {
    expect(at('2026-11-12T19:00:00Z')).toEqual({ position: DESTINATION.position, hasArrived: true })
    expect(at('2026-11-13T09:00:00Z')).toEqual({ position: DESTINATION.position, hasArrived: true })
  })

  it('handles a route with one checkpoint', () => {
    expect(at('2026-11-12T12:00:00Z', [ORIGIN])).toEqual({
      position: ORIGIN.position,
      hasArrived: false,
    })
    expect(at('2026-11-12T13:00:00Z', [ORIGIN])).toEqual({
      position: ORIGIN.position,
      hasArrived: true,
    })
  })

  it('has no position for a route without checkpoints', () => {
    expect(at('2026-11-12T13:00:00Z', [])).toBeNull()
  })

  it('moves on to the later checkpoint when two ETAs are equal, never dividing by zero', () => {
    const sameEta = [ORIGIN, { ...MIDDLE, eta_utc: ORIGIN.eta_utc }, DESTINATION]

    expect(at('2026-11-12T13:00:00Z', sameEta)?.position).toEqual(MIDDLE.position)
    expect(at('2026-11-12T16:00:00Z', sameEta)?.position).toEqual({ lat: 41.5, lon: -97 })
  })

  it('stays finite when ETAs go backwards', () => {
    const backwards = [ORIGIN, { ...MIDDLE, eta_utc: '2026-11-12T12:00:00Z' }, DESTINATION]

    const position = at('2026-11-12T16:00:00Z', backwards)?.position

    expect(Number.isFinite(position?.lat)).toBe(true)
    expect(Number.isFinite(position?.lon)).toBe(true)
  })
})
