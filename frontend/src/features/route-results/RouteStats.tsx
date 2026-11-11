import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { browserTimeZone, formatLocalTime } from '../../shared/time'
import type { Route } from '../../shared/types'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Typography variant="caption" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography variant="body1" component="dd" sx={{ m: 0, fontWeight: 600 }}>
        {value}
      </Typography>
    </div>
  )
}

export function RouteStats({ route }: { route: Route }) {
  const { summary, checkpoints } = route
  const arrivalZone = checkpoints.at(-1)?.time_zone ?? browserTimeZone()
  return (
    <Box
      component="dl"
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 1.5,
        m: 0,
      }}
    >
      <Stat label="Distance" value={`${summary.distance_miles} mi`} />
      <Stat label="Travel time" value={summary.travel_time_text} />
      <Stat label="Arrives" value={formatLocalTime(summary.arrival_utc, arrivalZone)} />
    </Box>
  )
}
