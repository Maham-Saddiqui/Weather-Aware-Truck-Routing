import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import Button from '@mui/material/Button'
import { styled } from '@mui/material/styles'
import { FOLLOW_PANEL_CLEARANCE_PX } from './mapConstants'

const Floating = styled(Button)(({ theme }) => ({
  position: 'absolute',
  left: theme.spacing(1),
  bottom: theme.spacing(1),
  minHeight: theme.spacing(5.5),
  borderRadius: theme.spacing(3),
  boxShadow: theme.shadows[6],
  backgroundColor: theme.palette.background.paper,
  [theme.breakpoints.up('md')]: {
    bottom: `calc(${theme.spacing(1)} + ${String(FOLLOW_PANEL_CLEARANCE_PX)}px)`,
  },
}))

interface ShowTruckButtonProps {
  onClick: () => void
}

// Sits bottom left: clear of the legend, the zoom buttons, the credits and, on wide screens, the forecast panel.
export function ShowTruckButton({ onClick }: ShowTruckButtonProps) {
  return (
    <Floating variant="outlined" startIcon={<LocalShippingIcon />} onClick={onClick}>
      Show truck
    </Floating>
  )
}
