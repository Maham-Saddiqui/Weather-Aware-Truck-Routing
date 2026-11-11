// The numbers of docs/domain/risk-rules.md sections 4 and 5, named once so the "How risk is calculated" text is built from them.
// Rain and snow edges are text because the dialog shows them with their trailing zero ("0.10", "1.0").

export const WIND_EDGES_MPH = [25, 35, 45, 55] as const // RR-03
export const RAIN_EDGES_IN_PER_HOUR = ['0.10', '0.25', '0.50', '1.00'] as const // RR-04
export const SNOW_EDGES_IN_PER_HOUR = ['0.5', '1.0', '2.0', '3.0'] as const // RR-05

export const NO_TRAVEL_ANY_LOAD_WIND_MPH = WIND_EDGES_MPH[3] // RR-06
export const NO_TRAVEL_HEAVY_LOAD_LB = 30_000 // RR-07
export const SEVERE_HEAVY_LOAD_LB = 40_000 // RR-08
export const MAX_MISSING_DATA_PERCENT = 10 // RR-22

type Edges = readonly [string, string, string, string]

export function windBands([moderate, high, severe, noTravel]: typeof WIND_EDGES_MPH): string[] {
  return [
    `below ${String(moderate)}`,
    `${String(moderate)} to ${String(high - 1)}`,
    `${String(high)} to ${String(severe - 1)}`,
    `${String(severe)} to ${String(noTravel - 1)}`,
    `${String(noTravel)} or more`,
  ]
}

export function rainOrSnowBands([moderate, high, severe, noTravel]: Edges): string[] {
  return [
    `below ${moderate}`,
    `${moderate} to below ${high}`,
    `${high} to below ${severe}`,
    `${severe} to ${noTravel}`,
    `above ${noTravel}`,
  ]
}

export function pounds(amount: number): string {
  return amount.toLocaleString('en-US')
}
