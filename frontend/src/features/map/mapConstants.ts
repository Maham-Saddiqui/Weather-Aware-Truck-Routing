export const BASEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'

// The contiguous United States, so the empty map opens on the country the app serves at any window size.
export const UNITED_STATES_BOUNDS: [[number, number], [number, number]] = [
  [-125, 24],
  [-66.5, 49.5],
]

// Place names in the free dark basemap are mid grey; these lift them above 7:1 against the dark land.
export const LABEL_TEXT_COLOUR = '#e2e8f0'
export const LABEL_HALO_COLOUR = '#0b1623'
export const LABEL_HALO_WIDTH_PX = 1.6

export const FIT_PADDING_PX = 56
// The forecast panel floating over the bottom of the map on wide screens is about 125 px tall with its reserved
// arrival row, and the destination pin's city label hangs about 24 px below its point.
export const FIT_BOTTOM_CLEARANCE_PX = 124
// Measured in a browser: the legend sits 8 px below the top edge and is about 60 px tall, at wide and phone widths alike.
export const LEGEND_BOTTOM_PX = 68
// The truck pin stands about 63 px above its point, so a route start under the legend would hide the pin.
export const TRUCK_PIN_HEIGHT_PX = 63
export const FIT_TOP_CLEARANCE_PX = LEGEND_BOTTOM_PX + TRUCK_PIN_HEIGHT_PX
// The zoom buttons end 51 px from the right edge; half a pin's width must stay clear of them too.
export const FIT_RIGHT_CLEARANCE_PX = 76

export const INITIAL_VIEW = {
  bounds: UNITED_STATES_BOUNDS,
  fitBoundsOptions: {
    padding: {
      top: LEGEND_BOTTOM_PX,
      left: FIT_PADDING_PX,
      right: FIT_RIGHT_CLEARANCE_PX,
      bottom: FIT_PADDING_PX,
    },
  },
} as const
export const FIT_DURATION_MS = 700

// A checkpoint dot is 24 px wide; at least this far apart they stay separate dots instead of one smear.
export const MIN_DOT_SPACING_PX = 30
export const MAX_DOT_STRIDE = 8

export const ROUTE_LINE_LAYER_ID = 'route-line'
export const ROUTE_HIT_LAYER_ID = 'route-hit'
export const HEATMAP_LAYER_ID = 'heatmap-circles'

export const ROUTE_HIT_WIDTH_PX = 22

// At or below this map width the other routes' names are left off the map (the cards name them and there is no
// room), and a small colour key stands in for them.
export const NAMES_HIDDEN_BELOW_MAP_WIDTH_PX = 420

// Heatmap circles grow with zoom so a 25 mile spacing stays a continuous band at every zoom.
export const HEATMAP_RADIUS_STOPS_ZOOM_PX = [3, 12, 6, 26, 9, 70] as const
export const HEATMAP_BLUR = 0.9
// One playback step lasts 1000 ms at normal speed; the glow fades well inside it.
export const HEATMAP_FADE_MS = 400

// The truck is kept as far below the top edge as a route start is, so its pin never sits behind the legend.
export const FOLLOW_TOP_CLEARANCE_PX = FIT_TOP_CLEARANCE_PX
export const FOLLOW_EDGE_CLEARANCE_PX = 24
export const FOLLOW_IN_VIEW_SLACK_PX = 8
// The forecast panel floats above the bottom of the map. Measured in a browser, a map up to 560 px wide has a compact
// panel 128.7 px tall and 12 px above the edge (plus 10 px of margin is 151); up to 700 px it is at most 128 px. Wide
// maps have a panel about 132 px tall and 24 px above the edge (156). The map frame's width picks the step.
export const NARROW_MAP_BELOW_PX = 440
export const MEDIUM_MAP_BELOW_PX = 700
export const FOLLOW_WIDE_PANEL_CLEARANCE_PX = 156
export const FOLLOW_MEDIUM_PANEL_CLEARANCE_PX = 151
export const FOLLOW_NARROW_PANEL_CLEARANCE_PX = 151
export const FOLLOW_EASE_MS = 600
// The truck glides between two forecast hours for at most as long as one playback step lasts at normal speed.
export const TRUCK_TWEEN_MAX_MS = 1000

export const UNSELECTED_DOTS_SOURCE_ID = 'unselected-dots'
// The dots of routes that are not selected thin out with zoom: tier 0 (every 4th checkpoint and the destination) always,
// tier 1 (the other even ones) and tier 2 (the odd ones) once zoomed in far enough to keep them apart.
export const UNSELECTED_DOT_TIER_MIN_ZOOMS = [0, 6, 7] as const
export const UNSELECTED_DOT_LAYER_IDS = UNSELECTED_DOT_TIER_MIN_ZOOMS.map(
  (_, tier) => `unselected-dots-${String(tier)}`,
)
