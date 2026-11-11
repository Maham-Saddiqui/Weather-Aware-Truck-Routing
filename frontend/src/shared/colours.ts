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

// One line hue per route position, the same whether the route is selected or not. They stay clear of the risk
// colours (green, yellow, orange, red, purple) and of each other for colour-blind readers, and each is at least
// 3:1 against the dark basemap (FE-15).
export const ROUTE_HUES = ['#3b82f6', '#f1f5f9', '#22d3ee'] as const

export const ROUTE_CASING_COLOUR = '#0d1e2d'
