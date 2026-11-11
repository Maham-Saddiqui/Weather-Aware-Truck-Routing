export const BASEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'

export const INITIAL_VIEW = { longitude: -98, latitude: 39, zoom: 3 } as const

export const FIT_PADDING_PX = 56
export const FIT_DURATION_MS = 700

export const ROUTE_LINE_LAYER_ID = 'route-line'
export const ROUTE_HIT_LAYER_ID = 'route-hit'
export const HEATMAP_LAYER_ID = 'heatmap-circles'

// Interface accent for the chosen route and a muted slate for the others (route colour is not risk colour, FE-15).
export const ROUTE_COLOUR_SELECTED = '#2dd4bf'
export const ROUTE_COLOUR_MUTED = '#6b7c8f'
export const ROUTE_CASING_COLOUR = '#0d1e2d'

export const ROUTE_HIT_WIDTH_PX = 22

// Heatmap circles grow with zoom so a 25 mile spacing stays a continuous band at every zoom.
export const HEATMAP_RADIUS_STOPS_ZOOM_PX = [3, 12, 6, 26, 9, 70] as const
export const HEATMAP_BLUR = 0.9
