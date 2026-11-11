import { LEVEL_LABELS } from '../../shared/risk'
import type { Checkpoint } from '../../shared/types'

type DrivingFactor = Checkpoint['driving_factors'][number]
type Measurements = Checkpoint['measurements']
type LoadRaise = Exclude<Checkpoint['load_rule'], 'none'>

const LOAD_RAISES: Record<LoadRaise, string> = {
  raised_to_severe: `from ${LEVEL_LABELS.high} to ${LEVEL_LABELS.severe}`,
  raised_to_no_travel: `from ${LEVEL_LABELS.severe} to ${LEVEL_LABELS.no_travel}`,
}

const FACTOR_NAMES: Record<DrivingFactor, string> = { wind: 'Wind', rain: 'Rain', snow: 'Snow' }

const READING_PHRASES: Record<DrivingFactor, (measurements: Measurements) => string | null> = {
  wind: ({ wind_mph }) => (wind_mph === null ? null : `of ${wind_mph} mph`),
  rain: ({ rain_in_hr }) => (rain_in_hr === null ? null : `at ${rain_in_hr} in/hr`),
  snow: ({ snow_in_hr }) => (snow_in_hr === null ? null : `at ${snow_in_hr} in/hr`),
}

function factorSentence(checkpoint: Checkpoint, factor: DrivingFactor): string {
  const reading = READING_PHRASES[factor](checkpoint.measurements)
  return [FACTOR_NAMES[factor], reading, 'sets the rating.'].filter(Boolean).join(' ')
}

function loadSentence({ measurements, load_rule }: Checkpoint & { load_rule: LoadRaise }): string {
  const wind = measurements.wind_mph === null ? 'wind' : `${measurements.wind_mph} mph wind`
  return `Heavy load raises ${wind} ${LOAD_RAISES[load_rule]}.`
}

export function describeDrivingFactors(checkpoint: Checkpoint): string[] {
  if (checkpoint.level === 'no_data') return ['Some weather readings are missing here.']
  if (checkpoint.level === 'low') return ['No weather factor raises the risk here.']
  const { load_rule } = checkpoint
  if (load_rule === 'none') {
    return checkpoint.driving_factors.map((factor) => factorSentence(checkpoint, factor))
  }
  const otherFactors = checkpoint.driving_factors.filter((factor) => factor !== 'wind')
  return [
    loadSentence({ ...checkpoint, load_rule }),
    ...otherFactors.map((factor) => factorSentence(checkpoint, factor)),
  ]
}
