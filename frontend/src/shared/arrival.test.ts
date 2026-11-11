import { describe, expect, it } from 'vitest'
import { arrivalEtaUtc } from './arrival'
import { makeCheckpoint, makeRoute } from './testing/fixtures'

describe('arrivalEtaUtc (RR-19)', () => {
  it('is the ETA of the destination, the last checkpoint', () => {
    const route = makeRoute('route-a', {
      checkpoints: [
        makeCheckpoint({ eta_utc: '2026-11-12T14:00:00Z' }),
        makeCheckpoint({ index: 1, eta_utc: '2026-11-12T16:30:00Z' }),
      ],
    })

    expect(arrivalEtaUtc(route)).toBe('2026-11-12T16:30:00Z')
  })

  it('is nothing for a route without checkpoints', () => {
    expect(arrivalEtaUtc(makeRoute('route-a', { checkpoints: [] }))).toBeNull()
  })
})
