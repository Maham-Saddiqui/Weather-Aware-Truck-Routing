import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import Button from '@mui/material/Button'
import { styled } from '@mui/material/styles'
import { MEDIUM_MAP_BELOW_PX, NARROW_MAP_BELOW_PX } from './mapConstants'

// The forecast panel floating over the map grows taller as the map narrows (measured in a browser: about 106 px
// tall at 820 px wide, 132 at 640, 178 at 428, 208 at 380), and the chip must stay above it with a small gap.
const BOTTOM_ABOVE_WIDE_PANEL_PX = 156
const BOTTOM_ABOVE_MEDIUM_PANEL_PX = 208
const BOTTOM_ABOVE_NARROW_PANEL_PX = 248

const Floating = styled(Button)(({ theme }) => ({
  position: 'absolute',
  left: theme.spacing(1),
  bottom: theme.spacing(4.5),
  minHeight: theme.spacing(6),
  borderRadius: theme.spacing(3),
  boxShadow: theme.shadows[8],
  fontSize: theme.typography.body1.fontSize,
  [theme.breakpoints.up('md')]: {
    bottom: BOTTOM_ABOVE_WIDE_PANEL_PX,
    [`@container (max-width: ${String(MEDIUM_MAP_BELOW_PX)}px)`]: {
      bottom: BOTTOM_ABOVE_MEDIUM_PANEL_PX,
    },
    [`@container (max-width: ${String(NARROW_MAP_BELOW_PX)}px)`]: {
      bottom: BOTTOM_ABOVE_NARROW_PANEL_PX,
    },
  },
}))

interface ShowTruckButtonProps {
  onClick: () => void
}

// Sits bottom left: clear of the legend, the zoom buttons, the credits (which run wide on a phone) and, on wide screens, the forecast panel.
export function ShowTruckButton({ onClick }: ShowTruckButtonProps) {
  return (
    <Floating variant="contained" size="large" startIcon={<LocalShippingIcon />} onClick={onClick}>
      Show truck
    </Floating>
  )
}
