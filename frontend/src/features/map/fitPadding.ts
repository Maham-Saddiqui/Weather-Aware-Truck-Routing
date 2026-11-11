import {
  FIT_BOTTOM_CLEARANCE_PX,
  FIT_PADDING_PX,
  FIT_RIGHT_CLEARANCE_PX,
  FIT_TOP_CLEARANCE_PX,
} from './mapConstants'

// The legend and a truck pin cover the top and the zoom buttons the right edge, so the route is fitted
// clear of them. On wide screens the forecast panel also floats over the bottom; on phones it sits below the map.
export function fitPadding(isPanelOverMap: boolean) {
  return {
    top: FIT_TOP_CLEARANCE_PX,
    left: FIT_PADDING_PX,
    right: FIT_RIGHT_CLEARANCE_PX,
    bottom: isPanelOverMap ? FIT_PADDING_PX + FIT_BOTTOM_CLEARANCE_PX : FIT_PADDING_PX,
  }
}
