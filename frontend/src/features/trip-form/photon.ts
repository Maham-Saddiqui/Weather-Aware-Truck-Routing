import { ApiError } from '../../shared/api/problems'
import {
  LOWER_48_BOUNDING_BOX,
  PHOTON_COUNTRY_CODE,
  PHOTON_SEARCH_URL,
  SUGGESTION_LIMIT,
} from '../../shared/constants'
import type { Place } from '../../shared/types'
import { placeLabel, type PhotonProperties } from './placeLabel'

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: PhotonProperties
}

function toPlace({ geometry, properties }: PhotonFeature): Place {
  const [lon, lat] = geometry.coordinates
  return { label: placeLabel(properties), lat, lon }
}

function withoutRepeats(places: Place[]): Place[] {
  return places.filter(
    (place, index) => places.findIndex((other) => other.label === place.label) === index,
  )
}

function buildSearchUrl(query: string): URL {
  const url = new URL(PHOTON_SEARCH_URL)
  url.search = new URLSearchParams({
    q: query,
    limit: String(SUGGESTION_LIMIT),
    lang: 'en',
    bbox: LOWER_48_BOUNDING_BOX,
  }).toString()
  return url
}

export async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  let features: PhotonFeature[]
  try {
    const response = await fetch(buildSearchUrl(query), { signal })
    if (!response.ok) throw new ApiError('suggestions_unavailable')
    features = ((await response.json()) as { features: PhotonFeature[] }).features
  } catch (error) {
    if (signal.aborted) throw error
    throw new ApiError('suggestions_unavailable')
  }
  const inCountry = features.filter(
    (feature) => feature.properties.countrycode === PHOTON_COUNTRY_CODE,
  )
  return withoutRepeats(inCountry.map(toPlace).filter((place) => place.label !== ''))
}
