import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'

const TRUCK_PX = 40
const TAIL_PX = 7

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
  left: '100%',
  top: '50%',
  transform: 'translateY(-50%)',
  marginLeft: theme.spacing(0.75),
  padding: theme.spacing(0, 0.75),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  fontWeight: 'bold',
}))

interface TruckBadgeProps {
  label: string
  hasArrived: boolean
}

// A pin that floats above the route line, so it never hides the checkpoint dots underneath.
export function TruckBadge({ label, hasArrived }: TruckBadgeProps) {
  return (
    <Pin role="img" aria-label={label}>
      <LocalShippingIcon />
      {hasArrived && <ArrivedLabel variant="caption">Arrived</ArrivedLabel>}
    </Pin>
  )
}
