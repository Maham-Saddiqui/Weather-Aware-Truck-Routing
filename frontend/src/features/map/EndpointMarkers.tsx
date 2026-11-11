import Box from '@mui/material/Box'
import { Marker } from '@vis.gl/react-maplibre'
import { memo } from 'react'
import type { Checkpoint, Route } from '../../shared/types'

const BADGE_PX = 28

export interface EndpointLabels {
  origin: string
  destination: string
}

type LatLon = Checkpoint['position']

interface EndpointBadgeProps {
  position: LatLon
  letter: 'A' | 'B'
  name: string
}

function EndpointBadgeView({ position, letter, name }: EndpointBadgeProps) {
  const isStart = letter === 'A'
  return (
    <Marker longitude={position.lon} latitude={position.lat} anchor="center">
      <Box
        role="img"
        aria-label={name}
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: BADGE_PX,
          height: BADGE_PX,
          borderRadius: 1,
          border: 2,
          borderColor: 'common.white',
          bgcolor: isStart ? 'primary.main' : 'text.primary',
          color: 'background.default',
          fontWeight: 'bold',
          boxShadow: 3,
        }}
      >
        {letter}
      </Box>
    </Marker>
  )
}

const EndpointBadge = memo(EndpointBadgeView)

function withName(prefix: string, label: string | undefined): string {
  return label === undefined ? prefix : `${prefix}: ${label}`
}

interface EndpointMarkersProps {
  route: Route
  labels?: EndpointLabels
}

// Drawn on the two ends of the selected route, above the checkpoint dots; the names come from the places the driver chose.
export function EndpointMarkers({ route, labels }: EndpointMarkersProps) {
  const start = route.checkpoints[0]
  const destination = route.checkpoints.at(-1)
  if (!start || !destination) {
    return null
  }
  return (
    <>
      <EndpointBadge
        position={start.position}
        letter="A"
        name={withName('Start', labels?.origin)}
      />
      <EndpointBadge
        position={destination.position}
        letter="B"
        name={withName('Destination', labels?.destination)}
      />
    </>
  )
}
