export type LonLat = [longitude: number, latitude: number]

const CHUNK_BITS = 5
const CONTINUATION_BIT = 0x20
const CHUNK_MASK = 0x1f
const ASCII_OFFSET = 63

interface DecodedNumber {
  value: number
  nextIndex: number
}

function readSignedNumber(encoded: string, startIndex: number): DecodedNumber {
  let result = 0
  let shift = 0
  let index = startIndex
  let chunk = CONTINUATION_BIT
  while (chunk >= CONTINUATION_BIT) {
    if (index >= encoded.length) {
      throw new Error('The route line ends in the middle of a number')
    }
    chunk = encoded.charCodeAt(index) - ASCII_OFFSET
    result += (chunk & CHUNK_MASK) * 2 ** shift
    shift += CHUNK_BITS
    index += 1
  }
  const isNegative = result % 2 === 1
  return { value: isNegative ? -(result + 1) / 2 : result / 2, nextIndex: index }
}

export function decodePolyline(encoded: string, precision: number): LonLat[] {
  const scale = 10 ** precision
  const points: LonLat[] = []
  let latitudeUnits = 0
  let longitudeUnits = 0
  let index = 0
  while (index < encoded.length) {
    const latitudeStep = readSignedNumber(encoded, index)
    const longitudeStep = readSignedNumber(encoded, latitudeStep.nextIndex)
    latitudeUnits += latitudeStep.value
    longitudeUnits += longitudeStep.value
    index = longitudeStep.nextIndex
    points.push([longitudeUnits / scale, latitudeUnits / scale])
  }
  return points
}
