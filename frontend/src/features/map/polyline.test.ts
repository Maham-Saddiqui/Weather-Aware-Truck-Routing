import { describe, expect, it } from 'vitest'
import { decodePolyline } from './polyline'

describe('decodePolyline (REQ-08: draw the route line the server sent)', () => {
  it('decodes the well-known three point example at precision 5 into longitude, latitude pairs', () => {
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5)

    expect(points).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ])
  })

  it('uses the precision of the response, so the same text means other places at precision 6', () => {
    const [first] = decodePolyline('_p~iF~ps|U', 6)

    expect(first).toEqual([-12.02, 3.85])
  })

  it('returns no points for an empty line', () => {
    expect(decodePolyline('', 5)).toEqual([])
  })

  it('fails loudly when the text stops in the middle of a number', () => {
    expect(() => decodePolyline('_p~iF~ps', 5)).toThrow('ends in the middle')
  })
})
