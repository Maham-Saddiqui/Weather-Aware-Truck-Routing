import {
  FIT_PADDING_PX,
  FOLLOW_EDGE_CLEARANCE_PX,
  FOLLOW_MEDIUM_PANEL_CLEARANCE_PX,
  FOLLOW_NARROW_PANEL_CLEARANCE_PX,
  FOLLOW_TOP_CLEARANCE_PX,
  FOLLOW_WIDE_PANEL_CLEARANCE_PX,
  MEDIUM_MAP_BELOW_PX,
  NARROW_MAP_BELOW_PX,
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

function panelClearance(mapWidth: number): number {
  if (mapWidth <= NARROW_MAP_BELOW_PX) {
    return FOLLOW_NARROW_PANEL_CLEARANCE_PX
  }
  return mapWidth <= MEDIUM_MAP_BELOW_PX
    ? FOLLOW_MEDIUM_PANEL_CLEARANCE_PX
    : FOLLOW_WIDE_PANEL_CLEARANCE_PX
}

// Keeps the truck clear of the legend (top left), the zoom buttons (top right) and, when the forecast panel
// floats over the bottom of the map, the panel, whose height follows the map's width.
export function safeMargins(mapWidth: number, isPanelOverMap: boolean): Margins {
  return {
    top: FOLLOW_TOP_CLEARANCE_PX,
    right: FIT_PADDING_PX,
    left: FIT_PADDING_PX,
    bottom: isPanelOverMap ? panelClearance(mapWidth) : FOLLOW_EDGE_CLEARANCE_PX,
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
