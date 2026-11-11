import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { formatLocalTime } from '../../shared/time'
import type { Checkpoint } from '../../shared/types'
import { describeDrivingFactors } from './drivingFactors'
import { RiskChip } from './RiskChip'

function reading(value: string | null, unit: string): string {
  return value === null ? 'No reading' : `${value} ${unit}`
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Typography variant="caption" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography variant="body2" component="dd" sx={{ m: 0, fontWeight: 600 }}>
        {value}
      </Typography>
    </div>
  )
}

export function CheckpointDetails({ checkpoint }: { checkpoint: Checkpoint }) {
  const { measurements } = checkpoint
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h3" component="h4" sx={{ mb: 1 }}>
        Mile {checkpoint.distance_miles} <RiskChip level={checkpoint.level} />
      </Typography>
      <Box
        component="dl"
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: 1,
          m: 0,
        }}
      >
        <Detail label="Wind" value={reading(measurements.wind_mph, 'mph')} />
        <Detail label="Gusts" value={reading(measurements.gust_mph, 'mph')} />
        <Detail label="Rain" value={reading(measurements.rain_in_hr, 'in/hr')} />
        <Detail label="Snow" value={reading(measurements.snow_in_hr, 'in/hr')} />
        <Detail
          label="Estimated arrival"
          value={formatLocalTime(checkpoint.eta_utc, checkpoint.time_zone)}
        />
      </Box>
      {describeDrivingFactors(checkpoint).map((sentence) => (
        <Typography key={sentence} variant="body2" sx={{ mt: 1 }}>
          {sentence}
        </Typography>
      ))}
    </Paper>
  )
}
