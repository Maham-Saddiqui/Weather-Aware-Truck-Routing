import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import Stack from '@mui/material/Stack'
import { alpha, styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'

const ICON_TILE_SIZE_PX = 48
const CARD_MAX_WIDTH_PX = 300

const Overlay = styled('div')(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  padding: theme.spacing(2),
  pointerEvents: 'none',
}))

const Card = styled(Stack)(({ theme }) => ({
  maxWidth: CARD_MAX_WIDTH_PX,
  padding: theme.spacing(2),
  alignItems: 'center',
  textAlign: 'center',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.94),
  boxShadow: theme.shadows[6],
}))

const IconTile = styled('span')(({ theme }) => ({
  display: 'grid',
  placeItems: 'center',
  width: ICON_TILE_SIZE_PX,
  height: ICON_TILE_SIZE_PX,
  borderRadius: theme.shape.borderRadius,
  color: theme.palette.primary.main,
  backgroundColor: alpha(theme.palette.primary.main, 0.14),
}))

// Shown on the map, where the first trip will appear, until a trip is planned; a card below the form was off screen.
export function EmptyMapCard() {
  return (
    <Overlay>
      <Card spacing={1}>
        <IconTile>
          <TravelExploreIcon fontSize="large" aria-hidden />
        </IconTile>
        <Typography variant="h3" component="h2">
          Plan your first trip
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pick an example or enter a trip to see route options with weather risk.
        </Typography>
      </Card>
    </Overlay>
  )
}
