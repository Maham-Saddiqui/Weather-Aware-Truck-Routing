import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Providers } from './Providers'
import { RiskInfoDialog } from './RiskInfoDialog'
import {
  MAX_MISSING_DATA_PERCENT,
  NO_TRAVEL_ANY_LOAD_WIND_MPH,
  NO_TRAVEL_HEAVY_LOAD_LB,
  RAIN_EDGES_IN_PER_HOUR,
  SEVERE_HEAVY_LOAD_LB,
  SNOW_EDGES_IN_PER_HOUR,
  WIND_EDGES_MPH,
} from './riskRuleNumbers'

// Literals copied from docs/domain/risk-rules.md sections 4 and 5; the README table repeats the same numbers.
const RULE_BOOK = {
  windEdges: [25, 35, 45, 55],
  rainEdges: ['0.10', '0.25', '0.50', '1.00'],
  snowEdges: ['0.5', '1.0', '2.0', '3.0'],
  windByLevel: [['25'], ['25', '34'], ['35', '44'], ['45', '54'], ['55']],
  rainByLevel: [['0.10'], ['0.10', '0.25'], ['0.25', '0.50'], ['0.50', '1.00'], ['1.00']],
  snowByLevel: [['0.5'], ['0.5', '1.0'], ['1.0', '2.0'], ['2.0', '3.0'], ['3.0']],
  loadRuleNumbers: ['35', '44', '40,000', '45', '54', '30,000', '55'],
  missingDataPercent: 10,
}
const LEVELS = ['Low', 'Moderate', 'High', 'Severe', 'No Travel']

function renderDialog() {
  render(
    <Providers>
      <RiskInfoDialog open onClose={vi.fn()} />
    </Providers>,
  )
}

function numbersIn(text: string): string[] {
  return text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []
}

function bandNumbers(columnPosition: number): string[][] {
  return LEVELS.map((level) => {
    const row = screen.getByRole('rowheader', { name: level }).closest('tr') as HTMLElement
    return numbersIn(within(row).getAllByRole('cell')[columnPosition]?.textContent ?? '')
  })
}

describe('the "How risk is calculated" numbers cannot drift from the rules (RR-31)', () => {
  it('names the same band edges as the rule book (RR-03, RR-04, RR-05)', () => {
    expect([...WIND_EDGES_MPH]).toEqual(RULE_BOOK.windEdges)
    expect([...RAIN_EDGES_IN_PER_HOUR]).toEqual(RULE_BOOK.rainEdges)
    expect([...SNOW_EDGES_IN_PER_HOUR]).toEqual(RULE_BOOK.snowEdges)
  })

  it('shows the wind band numbers of the rule book in every row (RR-03)', () => {
    renderDialog()

    expect(bandNumbers(0)).toEqual(RULE_BOOK.windByLevel)
  })

  it('shows the rain band numbers of the rule book in every row (RR-04)', () => {
    renderDialog()

    expect(bandNumbers(1)).toEqual(RULE_BOOK.rainByLevel)
  })

  it('shows the snow band numbers of the rule book in every row (RR-05)', () => {
    renderDialog()

    expect(bandNumbers(2)).toEqual(RULE_BOOK.snowByLevel)
  })

  it('names the load limits of the rule book and states them in the same order (RR-06, RR-07, RR-08)', () => {
    renderDialog()

    expect(NO_TRAVEL_ANY_LOAD_WIND_MPH).toBe(55)
    expect(NO_TRAVEL_HEAVY_LOAD_LB).toBe(30_000)
    expect(SEVERE_HEAVY_LOAD_LB).toBe(40_000)
    const loadParagraph = screen.getByText(/^A heavy load makes wind worse/)
    expect(numbersIn(loadParagraph.textContent)).toEqual(RULE_BOOK.loadRuleNumbers)
  })

  it('names the missing-data limit of the rule book and shows it (RR-22)', () => {
    renderDialog()

    expect(MAX_MISSING_DATA_PERCENT).toBe(RULE_BOOK.missingDataPercent)
    const paragraph = screen.getByText(/lacking weather data/)
    expect(numbersIn(paragraph.textContent)).toEqual([String(RULE_BOOK.missingDataPercent)])
  })
})
