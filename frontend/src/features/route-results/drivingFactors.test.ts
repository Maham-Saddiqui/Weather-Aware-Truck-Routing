import { describe, expect, it } from 'vitest'
import { makeCheckpoint } from '../../shared/testing/fixtures'
import { describeDrivingFactors } from './drivingFactors'

const WIND_38 = { wind_mph: '38', rain_in_hr: '0.00', snow_in_hr: '0.00', gust_mph: '50' }

describe('driving factors in plain words (RR-10)', () => {
  it('says a heavy load raises 38 mph wind from High to Severe', () => {
    const checkpoint = makeCheckpoint({
      level: 'severe',
      measurements: WIND_38,
      driving_factors: ['wind'],
      load_rule: 'raised_to_severe',
    })

    expect(describeDrivingFactors(checkpoint)).toEqual([
      'Heavy load raises 38 mph wind from High to Severe.',
    ])
  })

  it('says a heavy load raises wind from Severe to No Travel', () => {
    const checkpoint = makeCheckpoint({
      level: 'no_travel',
      measurements: { ...WIND_38, wind_mph: '50' },
      driving_factors: ['wind'],
      load_rule: 'raised_to_no_travel',
    })

    expect(describeDrivingFactors(checkpoint)).toEqual([
      'Heavy load raises 50 mph wind from Severe to No Travel.',
    ])
  })

  it('names rain with its reading when rain sets the rating', () => {
    const checkpoint = makeCheckpoint({
      level: 'high',
      measurements: { ...WIND_38, wind_mph: '30', rain_in_hr: '0.30' },
      driving_factors: ['rain'],
    })

    expect(describeDrivingFactors(checkpoint)).toEqual(['Rain at 0.30 in/hr sets the rating.'])
  })

  it('lists the load rule and the rain when both set a Severe rating', () => {
    const checkpoint = makeCheckpoint({
      level: 'severe',
      measurements: { ...WIND_38, rain_in_hr: '0.60' },
      driving_factors: ['wind', 'rain'],
      load_rule: 'raised_to_severe',
    })

    expect(describeDrivingFactors(checkpoint)).toEqual([
      'Heavy load raises 38 mph wind from High to Severe.',
      'Rain at 0.60 in/hr sets the rating.',
    ])
  })

  it('says readings are missing for a checkpoint with no data (RR-11)', () => {
    expect(describeDrivingFactors(makeCheckpoint({ level: 'no_data' }))).toEqual([
      'Some weather readings are missing here.',
    ])
  })
})
