import type { FeatureCollection, Point } from 'geojson'
import type { ExpressionSpecification } from 'maplibre-gl'
import type { Heatmap } from '../../shared/types'
import {
  LEVEL_FOR_DIGIT,
  NO_DATA_DIGIT,
  RISK_COLOURS,
  RISK_LEVELS_LOW_TO_NO_TRAVEL,
} from './riskScale'
import type { RiskLevel } from './riskScale'

const INVISIBLE = '#00000000'

// Opacity (as the last two hex digits) rises with risk, so Low is invisible and only risky stretches glow (FE-09).
const FILL_OPACITY_HEX: Record<Exclude<RiskLevel, 'low'>, string> = {
  moderate: '8c',
  high: 'a6',
  severe: 'bf',
  no_travel: 'cc',
  no_data: '1f',
}

function fillFor(level: RiskLevel): string {
  return level === 'low' ? INVISIBLE : `${RISK_COLOURS[level]}${FILL_OPACITY_HEX[level]}`
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
  const branches = RISK_LEVELS_LOW_TO_NO_TRAVEL.flatMap((level, digit) => [
    String(digit),
    fillFor(level),
  ])
  return ['match', digitAtHour, ...branches, fillFor('no_data')] as ExpressionSpecification
}

// RR-01: a larger digit is a worse level and "no data" is never a level, so it is skipped.
export function worstLevelAtHour(heatmap: Heatmap, hourOffset: number): RiskLevel | null {
  let worstDigit = ''
  for (const point of heatmap.points) {
    const digit = riskDigitAt(point.risk, hourOffset)
    if (digit !== NO_DATA_DIGIT && digit > worstDigit) {
      worstDigit = digit
    }
  }
  return LEVEL_FOR_DIGIT[worstDigit] ?? null
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
