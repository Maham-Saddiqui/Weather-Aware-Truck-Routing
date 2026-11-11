import type { CheckpointLevel } from './types'

export const RISK_COLOURS: Record<CheckpointLevel, string> = {
  low: '#4ade80',
  moderate: '#facc15',
  high: '#fb923c',
  severe: '#f87171',
  no_travel: '#c084fc',
  no_data: '#94a3b8',
}

export const ACCENT_TURQUOISE = '#2dd4bf'

// Route colour is an interface accent, never a risk colour (FE-15).
export const ROUTE_COLOURS = {
  selected: ACCENT_TURQUOISE,
  muted: '#6b7c8f',
  casing: '#0d1e2d',
} as const
