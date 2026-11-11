import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

const TRUCK_PX = 36

interface TruckBadgeProps {
  label: string
  hasArrived: boolean
}

export function TruckBadge({ label, hasArrived }: TruckBadgeProps) {
  return (
    <Box
      role="img"
      aria-label={label}
      sx={{
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        width: TRUCK_PX,
        height: TRUCK_PX,
        borderRadius: '50%',
        bgcolor: 'background.paper',
        color: 'primary.main',
        border: 2,
        borderColor: 'primary.main',
        boxShadow: 3,
      }}
    >
      <LocalShippingIcon fontSize="small" />
      {hasArrived && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: '100%',
            mt: 0.25,
            px: 0.75,
            borderRadius: 1,
            bgcolor: 'background.paper',
            fontWeight: 'bold',
          }}
        >
          Arrived
        </Typography>
      )}
    </Box>
  )
}
