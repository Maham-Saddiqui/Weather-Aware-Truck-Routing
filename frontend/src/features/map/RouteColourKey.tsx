import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import { NAMES_HIDDEN_BELOW_MAP_WIDTH_PX } from './mapConstants'

interface RouteColourKeyProps {
  routeCount: number
}

// On a phone-width map the other routes have no name pills, so this small key is the link between a line's colour
// and its card. Wider maps have the pills, so it is hidden there; the map's width is a container size.
export function RouteColourKey({ routeCount }: RouteColourKeyProps) {
  const { palette } = useTheme()
  return (
    <Paper
      component="ul"
      aria-label="Route colours"
      elevation={3}
      sx={{
        display: 'none',
        [`@container (max-width: ${String(NAMES_HIDDEN_BELOW_MAP_WIDTH_PX)}px)`]: {
          display: 'flex',
        },
        gap: 1.5,
        m: 0,
        px: 1,
        py: 0.25,
        listStyle: 'none',
        bgcolor: 'background.paper',
      }}
    >
      {palette.route.slice(0, routeCount).map((hue, index) => (
        <Box component="li" key={hue} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box aria-hidden="true" sx={{ width: 16, height: 4, borderRadius: 2, bgcolor: hue }} />
          <Typography variant="caption">{`Route ${String(index + 1)}`}</Typography>
        </Box>
      ))}
    </Paper>
  )
}
