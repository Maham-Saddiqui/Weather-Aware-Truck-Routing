export interface PhotonProperties {
  name?: string
  street?: string
  city?: string
  state?: string
  country?: string
  countrycode?: string
  type?: string
  osm_value?: string
}

const MAX_LABEL_LENGTH = 200
const COUNTY_WORDS = /county|parish|borough/i
const WIDE_AREAS = ['state', 'region']

function isKind(properties: PhotonProperties, kind: string): boolean {
  return properties.type === kind || properties.osm_value === kind
}

function nameWithKind(properties: PhotonProperties, name: string): string {
  if (isKind(properties, 'state')) return `${name} (state)`
  if (isKind(properties, 'region')) return `${name} (region)`
  if (isKind(properties, 'county') && !COUNTY_WORDS.test(name)) return `${name} (county)`
  return name
}

function containingPlaces(properties: PhotonProperties, name: string): (string | undefined)[] {
  if (WIDE_AREAS.some((kind) => isKind(properties, kind))) return [properties.country]
  return [properties.city === name ? undefined : properties.city, properties.state]
}

export function placeLabel(properties: PhotonProperties): string {
  const name = properties.name ?? properties.street
  if (name === undefined) return ''
  const parts = [nameWithKind(properties, name), ...containingPlaces(properties, name)]
  return parts
    .filter((part) => part !== undefined)
    .join(', ')
    .slice(0, MAX_LABEL_LENGTH)
}
