import { FIT_BOTTOM_CLEARANCE_PX, FIT_PADDING_PX } from './mapConstants'

// On wide screens the forecast panel floats over the bottom of the map, so the route is fitted
// above it; on phones the panel sits below the map and every side gets the same margin.
export function fitPadding(isPanelOverMap: boolean) {
  return isPanelOverMap
    ? {
        top: FIT_PADDING_PX,
        left: FIT_PADDING_PX,
        right: FIT_PADDING_PX,
        bottom: FIT_PADDING_PX + FIT_BOTTOM_CLEARANCE_PX,
      }
    : FIT_PADDING_PX
}
