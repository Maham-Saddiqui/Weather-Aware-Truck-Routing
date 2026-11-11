import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import { Marker } from '@vis.gl/react-maplibre'
import { memo } from 'react'
import { EndpointLetter } from '../../shared/EndpointLetter'
import type { Checkpoint, Route } from '../../shared/types'

const LABEL_MAX_WIDTH_PX = 112
// Above the checkpoint dots, the route name pills and the truck, whichever order they were added to the map in.
const ABOVE_OTHER_MARKERS = { zIndex: 3 } as const

export interface EndpointLabels {
  origin: string
  destination: string
}

type LatLon = Checkpoint['position']

interface EndpointBadgeProps {
  position: LatLon
  letter: 'A' | 'B'
  name: string
  placeLabel: string | undefined
}

function cityOf(placeLabel: string): string {
  return placeLabel.split(',')[0] ?? placeLabel
}

function EndpointBadgeView({ position, letter, name, placeLabel }: EndpointBadgeProps) {
  return (
    <Marker
      longitude={position.lon}
      latitude={position.lat}
      anchor="center"
      style={ABOVE_OTHER_MARKERS}
    >
      <Tooltip title={name} placement="top" arrow>
        <Box role="img" aria-label={name} sx={{ position: 'relative' }}>
          <EndpointLetter letter={letter} size="pin" />
          {placeLabel !== undefined && (
            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                mt: 0.25,
                px: 0.75,
                maxWidth: LABEL_MAX_WIDTH_PX,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                borderRadius: 1,
                bgcolor: 'background.paper',
                color: 'text.primary',
                typography: 'caption',
                fontWeight: 'bold',
              }}
            >
              {cityOf(placeLabel)}
            </Box>
          )}
        </Box>
      </Tooltip>
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
        placeLabel={labels?.origin}
      />
      <EndpointBadge
        position={destination.position}
        letter="B"
        name={withName('Destination', labels?.destination)}
        placeLabel={labels?.destination}
      />
    </>
  )
}
