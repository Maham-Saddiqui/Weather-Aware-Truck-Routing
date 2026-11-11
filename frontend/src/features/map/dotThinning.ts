import { MAX_DOT_STRIDE, MIN_DOT_SPACING_PX } from './mapConstants'

interface PixelPoint {
  x: number
  y: number
}

export function meanSpacingPx(points: readonly PixelPoint[]): number {
  if (points.length < 2) {
    return Infinity
  }
  const pathLength = points
    .slice(1)
    .reduce(
      (total, point, index) =>
        total + Math.hypot(point.x - (points[index]?.x ?? 0), point.y - (points[index]?.y ?? 0)),
      0,
    )
  return pathLength / (points.length - 1)
}

// Draws every 2nd, 4th or 8th checkpoint while the full set would merge into one smear; zooming in brings all back.
export function strideForSpacing(spacingPx: number): number {
  let stride = 1
  while (spacingPx * stride < MIN_DOT_SPACING_PX && stride < MAX_DOT_STRIDE) {
    stride *= 2
  }
  return stride
}

interface DrawChoice {
  position: number
  lastPosition: number
  stride: number
  isSelected: boolean
}

// The selected checkpoint and the two ends of the route are always drawn.
export function isDotDrawn({ position, lastPosition, stride, isSelected }: DrawChoice): boolean {
  return position % stride === 0 || position === lastPosition || isSelected
}
