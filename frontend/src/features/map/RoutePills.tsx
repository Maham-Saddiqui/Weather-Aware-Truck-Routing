import Box from '@mui/material/Box'
import { Marker } from '@vis.gl/react-maplibre'
import { formatDuration } from '../../shared/time'
import type { Route } from '../../shared/types'
import { lineMidpoint } from './lineMidpoint'
import type { RouteLines } from './routeGeoJson'

interface RoutePillsProps {
  routes: readonly Route[]
  lines: RouteLines
  selectedRouteId: string | null
  onSelectRoute: (routeId: string) => void
}

// The pill is not a tab stop on purpose: the route cards are the keyboard way to choose a route.
// Names and travel times are the server's; nothing is compared here (GEN-03).
export function RoutePills({ routes, lines, selectedRouteId, onSelectRoute }: RoutePillsProps) {
  return routes.map((route, index) => {
    const feature = lines.features[index]
    const midpoint = feature && lineMidpoint(feature.geometry.coordinates)
    if (!midpoint || route.id === selectedRouteId) {
      return null
    }
    return (
      <Marker
        key={route.id}
        longitude={midpoint[0]}
        latitude={midpoint[1]}
        anchor="center"
        onClick={() => {
          onSelectRoute(route.id)
        }}
      >
        <Box
          sx={{
            px: 1,
            py: 0.25,
            border: 2,
            borderColor: feature.properties.colour,
            borderRadius: 4,
            bgcolor: 'background.paper',
            color: 'text.primary',
            typography: 'caption',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          {`Route ${String(index + 1)} · ${formatDuration(route.summary.travel_time_s)}`}
        </Box>
      </Marker>
    )
  })
}
