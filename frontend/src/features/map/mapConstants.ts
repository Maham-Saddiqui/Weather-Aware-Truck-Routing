export const BASEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'

export const INITIAL_VIEW = { longitude: -98, latitude: 39, zoom: 3 } as const

export const FIT_PADDING_PX = 56
// The forecast panel floating over the bottom of the map on wide screens is about 100 px tall.
export const FIT_BOTTOM_CLEARANCE_PX = 100
// Measured in a browser: the legend sits 8 px below the top edge and is about 60 px tall, at wide and phone widths alike.
export const LEGEND_BOTTOM_PX = 68
// The truck pin stands about 63 px above its point, so a route start under the legend would hide the pin.
export const TRUCK_PIN_HEIGHT_PX = 63
export const FIT_TOP_CLEARANCE_PX = LEGEND_BOTTOM_PX + TRUCK_PIN_HEIGHT_PX
// The zoom buttons end 51 px from the right edge; half a pin's width must stay clear of them too.
export const FIT_RIGHT_CLEARANCE_PX = 76
export const FIT_DURATION_MS = 700

export const ROUTE_LINE_LAYER_ID = 'route-line'
export const ROUTE_HIT_LAYER_ID = 'route-hit'
export const HEATMAP_LAYER_ID = 'heatmap-circles'

export const ROUTE_HIT_WIDTH_PX = 22

// Heatmap circles grow with zoom so a 25 mile spacing stays a continuous band at every zoom.
export const HEATMAP_RADIUS_STOPS_ZOOM_PX = [3, 12, 6, 26, 9, 70] as const
export const HEATMAP_BLUR = 0.9
// One playback step lasts 1000 ms at normal speed; the glow fades well inside it.
export const HEATMAP_FADE_MS = 400

// The truck is kept as far below the top edge as a route start is, so its pin never sits behind the legend.
export const FOLLOW_TOP_CLEARANCE_PX = FIT_TOP_CLEARANCE_PX
export const FOLLOW_EDGE_CLEARANCE_PX = 24
// Measured in a browser: the forecast panel floats 24 px above the bottom and is about 106 px tall.
export const FOLLOW_PANEL_CLEARANCE_PX = 140
export const FOLLOW_EASE_MS = 600
// The truck glides between two forecast hours for at most as long as one playback step lasts at normal speed.
export const TRUCK_TWEEN_MAX_MS = 1000
