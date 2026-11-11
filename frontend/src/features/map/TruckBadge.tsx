import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import Box from '@mui/material/Box'
import { keyframes, styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'

const TRUCK_PX = 40
const TAIL_PX = 7

const PULSE_MS = 1800

const pulse = keyframes`
  from { transform: scale(1); opacity: 0.7; }
  to { transform: scale(2); opacity: 0; }
`

const PulseRing = styled('span')(({ theme }) => ({
  position: 'absolute',
  inset: -2,
  borderRadius: '50%',
  border: `2px solid ${theme.palette.primary.main}`,
  pointerEvents: 'none',
  animation: `${pulse} ${String(PULSE_MS)}ms ease-out infinite`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none', display: 'none' },
}))

const Pin = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'grid',
  placeItems: 'center',
  width: TRUCK_PX,
  height: TRUCK_PX,
  borderRadius: '50%',
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.primary.main,
  border: `2px solid ${theme.palette.primary.main}`,
  boxShadow: theme.shadows[3],
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 'calc(100% + 2px)',
    left: '50%',
    marginLeft: -TAIL_PX,
    borderStyle: 'solid',
    borderWidth: `${String(TAIL_PX)}px ${String(TAIL_PX)}px 0`,
    borderColor: `${theme.palette.primary.main} transparent transparent`,
  },
}))

const ArrivedLabel = styled(Typography)(({ theme }) => ({
  position: 'absolute',
  bottom: `calc(100% + ${theme.spacing(0.5)})`,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: theme.spacing(0, 0.75),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
}))

interface TruckBadgeProps {
  label: string
  hasArrived: boolean
}

// A pin that floats above the route line, so it never hides the checkpoint dots underneath.
// While the truck is on the move a soft ring pulses around it to draw the eye; reduced motion turns it off (FE-07).
export function TruckBadge({ label, hasArrived }: TruckBadgeProps) {
  return (
    <Pin role="img" aria-label={label}>
      {!hasArrived && <PulseRing aria-hidden="true" data-testid="truck-pulse" />}
      <LocalShippingIcon />
      {hasArrived && <ArrivedLabel variant="caption">Arrived</ArrivedLabel>}
    </Pin>
  )
}
