import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import Button from '@mui/material/Button'
import { styled } from '@mui/material/styles'
import { FOLLOW_PANEL_CLEARANCE_PX } from './mapConstants'

const Floating = styled(Button)(({ theme }) => ({
  position: 'absolute',
  left: theme.spacing(1),
  bottom: theme.spacing(4.5),
  minHeight: theme.spacing(6),
  borderRadius: theme.spacing(3),
  boxShadow: theme.shadows[8],
  fontSize: theme.typography.body1.fontSize,
  [theme.breakpoints.up('md')]: {
    bottom: `calc(${theme.spacing(1)} + ${String(FOLLOW_PANEL_CLEARANCE_PX)}px)`,
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
