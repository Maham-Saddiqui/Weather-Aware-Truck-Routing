import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { PHOTON_SEARCH_URL } from '../../shared/constants'
import { server } from '../../shared/testing/server'
import { placeLabel } from './placeLabel'
import { searchPlaces } from './photon'

const NEW_YORK_STATE = {
  name: 'New York',
  type: 'state',
  osm_value: 'administrative',
  state: 'New York',
  country: 'United States',
  countrycode: 'US',
}
const NEW_YORK_CITY = {
  name: 'New York',
  type: 'city',
  osm_value: 'city',
  state: 'New York',
  country: 'United States',
  countrycode: 'US',
}

function feature(properties: object, lon = -90, lat = 40) {
  return { geometry: { coordinates: [lon, lat] }, properties }
}

describe('address suggestion labels tell the kind of place (REQ-02, FE-10)', () => {
  it('tells New York state apart from New York city', () => {
    expect(placeLabel(NEW_YORK_STATE)).toBe('New York (state), United States')
    expect(placeLabel(NEW_YORK_CITY)).toBe('New York, New York')
  })

  it('shows an ordinary city as its name and state only', () => {
    const dallas = { name: 'Dallas', type: 'city', state: 'Texas', countrycode: 'US' }
    expect(placeLabel(dallas)).toBe('Dallas, Texas')
  })

  it('shows a county with its state and does not repeat the word county', () => {
    const named = { name: 'Dallas County', type: 'county', state: 'Texas' }
    const bare = { name: 'Harris', osm_value: 'county', state: 'Texas' }
    expect(placeLabel(named)).toBe('Dallas County, Texas')
    expect(placeLabel(bare)).toBe('Harris (county), Texas')
  })

  it('names a region as a region with its country', () => {
    const region = { name: 'Midwest', osm_value: 'region', country: 'United States' }
    expect(placeLabel(region)).toBe('Midwest (region), United States')
  })

  it('adds the containing city for a place inside a city', () => {
    const suburb = { name: 'Brooklyn', type: 'district', city: 'New York', state: 'New York' }
    expect(placeLabel(suburb)).toBe('Brooklyn, New York, New York')
  })

  it('works with missing properties', () => {
    expect(placeLabel({ name: 'Truck Stop' })).toBe('Truck Stop')
    expect(placeLabel({ street: 'Main Street', state: 'Ohio' })).toBe('Main Street, Ohio')
    expect(placeLabel({ name: 'Nevada', type: 'state' })).toBe('Nevada (state)')
    expect(placeLabel({ state: 'Ohio' })).toBe('')
  })

  it('keeps the label within the 200 character limit', () => {
    expect(placeLabel({ name: 'A'.repeat(300) })).toHaveLength(200)
  })
})

describe('address suggestion list (REQ-02, FE-10)', () => {
  const search = () => searchPlaces('new york', new AbortController().signal)

  it('lists the state and the city as two different suggestions', async () => {
    server.use(
      http.get(PHOTON_SEARCH_URL, () =>
        HttpResponse.json({
          features: [feature(NEW_YORK_STATE, -75.845, 43.156), feature(NEW_YORK_CITY, -74, 40.71)],
        }),
      ),
    )
    const places = await search()
    expect(places.map((place) => place.label)).toEqual([
      'New York (state), United States',
      'New York, New York',
    ])
    expect(places[0]).toMatchObject({ lat: 43.156, lon: -75.845 })
  })

  it('keeps only the first of suggestions that have the same label', async () => {
    const dallas = { name: 'Dallas', state: 'Texas', countrycode: 'US' }
    server.use(
      http.get(PHOTON_SEARCH_URL, () =>
        HttpResponse.json({
          features: [feature(dallas, -96.8, 32.78), feature(dallas, -96.7, 32.9)],
        }),
      ),
    )
    expect(await search()).toEqual([{ label: 'Dallas, Texas', lat: 32.78, lon: -96.8 }])
  })

  it('drops results outside the US and results with no name', async () => {
    server.use(
      http.get(PHOTON_SEARCH_URL, () =>
        HttpResponse.json({
          features: [
            feature({ name: 'Toronto', state: 'Ontario', countrycode: 'CA' }),
            feature({ state: 'Ohio', countrycode: 'US' }),
          ],
        }),
      ),
    )
    expect(await search()).toEqual([])
  })
})
