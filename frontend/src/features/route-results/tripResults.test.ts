import { describe, expect, it } from 'vitest'
import { makeCompareResponse, makePrimaryResponse } from '../../shared/testing/fixtures'
import { deriveTripResults, type QueryOutcome } from './tripResults'

const PENDING = { data: undefined, error: null, isError: false }
const FAILED = { data: undefined, error: new Error('x'), isError: true }
const primaryDone = { data: makePrimaryResponse(), error: null, isError: false }
const compareDone = { data: makeCompareResponse(), error: null, isError: false }

function derive(
  primary: QueryOutcome<ReturnType<typeof makePrimaryResponse>>,
  compare: QueryOutcome<ReturnType<typeof makeCompareResponse>>,
) {
  return deriveTripResults(primary, compare, true)
}

describe('combining the primary and compare requests (FE-18, REQ-10)', () => {
  it('shows nothing before a trip is sent', () => {
    expect(deriveTripResults(PENDING, PENDING, false).phase).toBe('idle')
  })

  it('shows the primary route as soon as it arrives', () => {
    const results = derive(primaryDone, PENDING)

    expect(results.phase).toBe('partial')
    expect(results.routes).toHaveLength(1)
  })

  it('ignores a late primary once compare has arrived', () => {
    const results = derive(primaryDone, compareDone)

    expect(results.phase).toBe('complete')
    expect(results.routes).toHaveLength(2)
  })

  it('takes the provider flag from compare, never mixing it with primary', () => {
    const valhallaCompare = {
      ...compareDone,
      data: { ...makeCompareResponse(), routing_provider: 'valhalla' as const },
    }

    expect(derive(primaryDone, valhallaCompare).routingProvider).toBe('valhalla')
  })

  it('keeps the primary route and flags alternatives when compare fails', () => {
    const results = derive(primaryDone, FAILED)

    expect(results.routes).toHaveLength(1)
    expect(results.alternativesUnavailable).toBe(true)
  })

  it('uses compare when primary failed but compare succeeded', () => {
    expect(derive(FAILED, compareDone).phase).toBe('complete')
  })

  it('fails only when both requests failed', () => {
    expect(derive(FAILED, PENDING).phase).toBe('loading')
    expect(derive(FAILED, FAILED).phase).toBe('failed')
  })
})
