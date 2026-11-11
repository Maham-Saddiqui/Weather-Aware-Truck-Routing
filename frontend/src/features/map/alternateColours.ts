// One line colour per route position, used while the route is not the selected one. They avoid the risk colours
// (green, yellow, orange, red, purple) and stay above 7:1 against the dark basemap; the pill text carries the name too.
const ALTERNATE_ROUTE_COLOURS = ['#60a5fa', '#e2e8f0', '#d4b483'] as const

export function alternateColourFor(routeIndex: number): string {
  return ALTERNATE_ROUTE_COLOURS[routeIndex % ALTERNATE_ROUTE_COLOURS.length] ?? '#e2e8f0'
}
