import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import Stack from '@mui/material/Stack'
import { alpha, styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'

const ICON_TILE_SIZE_PX = 56

const IconTile = styled('span')(({ theme }) => ({
  display: 'grid',
  placeItems: 'center',
  width: ICON_TILE_SIZE_PX,
  height: ICON_TILE_SIZE_PX,
  borderRadius: theme.shape.borderRadius,
  color: theme.palette.primary.main,
  backgroundColor: alpha(theme.palette.primary.main, 0.14),
}))

export function EmptyResults() {
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', py: 3 }}>
      <IconTile>
        <TravelExploreIcon fontSize="large" aria-hidden />
      </IconTile>
      <Typography variant="h3" component="h2">
        Plan your first trip
      </Typography>
      <Typography color="text.secondary">
        Pick an example or enter a trip to see route options with weather risk.
      </Typography>
    </Stack>
  )
}
