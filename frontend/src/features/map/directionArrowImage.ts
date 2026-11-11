export const ARROW_IMAGE_ID = 'route-direction-arrow'
// Softer than pure white, so the arrows read as a cue beside the near-white Route 2 line rather than a copy of it.
export const ARROW_CORE_COLOUR = '#cbd5e1'
// Drawn at twice the size it is shown at, so it stays sharp on high-density screens.
export const ARROW_IMAGE_PIXEL_RATIO = 2

const SIZE_PX = 44
const TIP: Point = [32, 22]
const ARM_ENDS: readonly Point[] = [
  [12, 6],
  [12, 38],
]
const STROKE_RADIUS_PX = 3.2
const HALO_RADIUS_PX = 5.2

type Point = readonly [number, number]
export type Rgb = readonly [number, number, number]

function distanceToSegment([x, y]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax
  const dy = by - ay
  const along = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - (ax + along * dx), y - (ay + along * dy))
}

function distanceToChevron(point: Point): number {
  return Math.min(...ARM_ENDS.map((end) => distanceToSegment(point, end, TIP)))
}

// One pixel of soft edge, so the arrow is smooth rather than jagged.
function coverage(distance: number, radius: number): number {
  return Math.max(0, Math.min(1, radius + 0.5 - distance))
}

// A chevron pointing right, in the core colour with a thin halo around it, as raw pixels for the map's image API.
export function arrowImageData(core: Rgb, halo: Rgb) {
  const data = new Uint8ClampedArray(SIZE_PX * SIZE_PX * 4)
  for (let row = 0; row < SIZE_PX; row += 1) {
    for (let column = 0; column < SIZE_PX; column += 1) {
      const distance = distanceToChevron([column + 0.5, row + 0.5])
      const haloShare = coverage(distance, HALO_RADIUS_PX)
      const coreShare = haloShare > 0 ? coverage(distance, STROKE_RADIUS_PX) / haloShare : 0
      const offset = (row * SIZE_PX + column) * 4
      core.forEach((channel, index) => {
        data[offset + index] = (halo[index] ?? 0) * (1 - coreShare) + channel * coreShare
      })
      data[offset + 3] = haloShare * 255
    }
  }
  return { width: SIZE_PX, height: SIZE_PX, data }
}
