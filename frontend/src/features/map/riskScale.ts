import type { Checkpoint } from '../../shared/types'

export type RiskLevel = Checkpoint['level']

export const RISK_LEVELS_LOW_TO_NO_TRAVEL = [
  'low',
  'moderate',
  'high',
  'severe',
  'no_travel',
] as const

export const NO_DATA_DIGIT = 'x'

export const RISK_WORDS: Record<RiskLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  severe: 'Severe',
  no_travel: 'No Travel',
  no_data: 'No data',
}

// The theme has no risk palette yet (FE-15 asks for one semantic scale). Until it does, this is the one
// place the map takes its colours from; swap these values for the theme's risk tokens when they exist.
export const RISK_COLOURS: Record<RiskLevel, string> = {
  low: '#4caf7a',
  moderate: '#f2c94c',
  high: '#f2994a',
  severe: '#eb5757',
  no_travel: '#bb6bd9',
  no_data: '#9aa5b1',
}

export const LEVEL_FOR_DIGIT: Record<string, RiskLevel> = {
  '0': 'low',
  '1': 'moderate',
  '2': 'high',
  '3': 'severe',
  '4': 'no_travel',
  [NO_DATA_DIGIT]: 'no_data',
}
