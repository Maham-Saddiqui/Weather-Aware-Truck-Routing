import {
  FIT_BOTTOM_CLEARANCE_PX,
  FIT_PADDING_PX,
  FOLLOW_EDGE_CLEARANCE_PX,
  FOLLOW_TOP_CLEARANCE_PX,
} from './mapConstants'

export interface PixelPoint {
  x: number
  y: number
}

export interface PixelSize {
  width: number
  height: number
}

export interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}

// Keeps the truck clear of the legend (top left), the zoom buttons (top right) and, on wide screens,
// the forecast panel floating over the bottom of the map.
export function safeMargins(isPanelOverMap: boolean): Margins {
  return {
    top: FOLLOW_TOP_CLEARANCE_PX,
    right: FIT_PADDING_PX,
    left: FIT_PADDING_PX,
    bottom: FOLLOW_EDGE_CLEARANCE_PX + (isPanelOverMap ? FIT_BOTTOM_CLEARANCE_PX : 0),
  }
}

export function isInsideSafeArea(point: PixelPoint, size: PixelSize, margins: Margins): boolean {
  return (
    point.x >= margins.left &&
    point.x <= size.width - margins.right &&
    point.y >= margins.top &&
    point.y <= size.height - margins.bottom
  )
}

// How far the safe area's middle lies from the map's middle: easing with this offset puts the truck in the middle of what the driver can see.
export function safeAreaCentreOffset(margins: Margins): [number, number] {
  return [(margins.left - margins.right) / 2, (margins.top - margins.bottom) / 2]
}
