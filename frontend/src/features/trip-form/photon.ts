import { ApiError } from '../../shared/api/problems'
import {
  LOWER_48_BOUNDING_BOX,
  PHOTON_COUNTRY_CODE,
  PHOTON_SEARCH_URL,
  SUGGESTION_LIMIT,
} from '../../shared/constants'
import type { Place } from '../../shared/types'

interface PhotonProperties {
  name?: string
  street?: string
  city?: string
  state?: string
  countrycode?: string
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: PhotonProperties
}

const MAX_LABEL_LENGTH = 200

export function placeLabel({ name, street, city, state }: PhotonProperties): string {
  const parts = [name ?? street, city, state].filter((part) => part !== undefined)
  return [...new Set(parts)].join(', ').slice(0, MAX_LABEL_LENGTH)
}

function toPlace({ geometry, properties }: PhotonFeature): Place {
  const [lon, lat] = geometry.coordinates
  return { label: placeLabel(properties), lat, lon }
}

function withoutRepeats(places: Place[]): Place[] {
  return [...new Map(places.map((place) => [place.label, place])).values()]
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
  return withoutRepeats(inCountry.map(toPlace))
}
