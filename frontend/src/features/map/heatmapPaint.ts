import type { FeatureCollection, Point } from 'geojson'
import type { ExpressionSpecification } from 'maplibre-gl'
import { RISK_COLOURS } from '../../shared/colours'
import { LEVEL_ORDER } from '../../shared/risk'
import type { CheckpointLevel, Heatmap } from '../../shared/types'

const DIGIT_LEVELS = LEVEL_ORDER.filter((level) => level !== 'no_data')
const LEVEL_FOR_DIGIT: Record<string, CheckpointLevel> = Object.fromEntries(
  DIGIT_LEVELS.map((level, digit) => [String(digit), level]),
)

// Opacity (as the last two hex digits) rises with risk: Low is a faint 12 percent tint that keeps the corridor
// visible, and only risky stretches glow (FE-09).
const FILL_OPACITY_HEX: Record<CheckpointLevel, string> = {
  low: '1f',
  moderate: '8c',
  high: 'a6',
  severe: 'bf',
  no_travel: 'cc',
  no_data: '73',
}

function fillFor(level: CheckpointLevel): string {
  return `${RISK_COLOURS[level]}${FILL_OPACITY_HEX[level]}`
}

export function riskDigitAt(risk: string, hourOffset: number): string {
  return risk.charAt(hourOffset)
}

// One paint expression per hour (RR-28): character h of each point's risk string picks its fill on the GPU.
export function circleFillForHour(hourOffset: number): ExpressionSpecification {
  const digitAtHour: ExpressionSpecification = [
    'slice',
    ['get', 'risk'],
    hourOffset,
    hourOffset + 1,
  ]
  const branches = DIGIT_LEVELS.flatMap((level, digit) => [String(digit), fillFor(level)])
  return ['match', digitAtHour, ...branches, fillFor('no_data')] as ExpressionSpecification
}

// FE-07: the server's worst-by-hour character (0 to 4 or x) in the shared level words.
export function levelForDigit(digit: string): CheckpointLevel | null {
  return LEVEL_FOR_DIGIT[digit] ?? null
}

export function heatmapFeatures(heatmap: Heatmap): FeatureCollection<Point, { risk: string }> {
  return {
    type: 'FeatureCollection',
    features: heatmap.points.map((point) => ({
      type: 'Feature',
      properties: { risk: point.risk },
      geometry: { type: 'Point', coordinates: [point.position.lon, point.position.lat] },
    })),
  }
}
