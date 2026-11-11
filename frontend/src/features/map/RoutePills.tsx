import Box from '@mui/material/Box'
import { Marker } from '@vis.gl/react-maplibre'
import { useMemo } from 'react'
import type { Route } from '../../shared/types'
import { NAMES_HIDDEN_BELOW_MAP_WIDTH_PX } from './mapConstants'
import { placePills, sideOffset } from './pillPlacement'
import type { RouteLines } from './routeGeoJson'

interface RoutePillsProps {
  routes: readonly Route[]
  lines: RouteLines
  selectedRouteId: string | null
  onSelectRoute: (routeId: string) => void
}

interface PillProps {
  position: number
  isSelected: boolean
  text: string
}

// The pill is not a tab stop on purpose: the route cards are the keyboard way to choose a route.
function Pill({ position, isSelected, text }: PillProps) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        border: 2,
        borderColor: `route.${String(position)}`,
        borderRadius: 4,
        bgcolor: isSelected ? `route.${String(position)}` : 'background.paper',
        color: isSelected ? 'background.default' : 'text.primary',
        typography: 'caption',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        cursor: isSelected ? 'default' : 'pointer',
        [`@container (max-width: ${String(NAMES_HIDDEN_BELOW_MAP_WIDTH_PX)}px)`]: {
          display: isSelected ? undefined : 'none',
        },
      }}
    >
      {text}
    </Box>
  )
}

// Names and travel times are the server's; nothing is compared here (GEN-03).
export function RoutePills({ routes, lines, selectedRouteId, onSelectRoute }: RoutePillsProps) {
  const spots = useMemo(() => placePills(lines, selectedRouteId), [lines, selectedRouteId])
  return routes.map((route, index) => {
    const spot = spots.get(route.id)
    const feature = lines.features[index]
    if (!spot || !feature) {
      return null
    }
    const isSelected = route.id === selectedRouteId
    const name = `Route ${String(index + 1)}`
    return (
      <Marker
        key={route.id}
        longitude={spot[0]}
        latitude={spot[1]}
        anchor="center"
        offset={isSelected ? sideOffset(feature.geometry.coordinates, spot) : undefined}
        onClick={() => {
          onSelectRoute(route.id)
        }}
      >
        <Pill
          position={index}
          isSelected={isSelected}
          text={isSelected ? name : `${name} · ${route.summary.travel_time_text}`}
        />
      </Marker>
    )
  })
}
