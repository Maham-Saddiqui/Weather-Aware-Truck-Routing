import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { RISK_COLOURS } from '../../shared/colours'
import { LEVEL_LABELS, RiskIcon } from '../../shared/risk'
import type { CheckpointLevel, Heatmap } from '../../shared/types'
import { levelForDigit, riskDigitAt } from './heatmapPaint'

interface HeatmapStatusProps {
  heatmap: Heatmap
  hourOffset: number
}

function statusText(worstLevel: CheckpointLevel | null): string {
  if (worstLevel === null) {
    return 'No weather data along these routes at this time'
  }
  return worstLevel === 'low'
    ? 'All clear along these routes at this time'
    : `Worst along these routes: ${LEVEL_LABELS[worstLevel]}`
}

// Low is transparent on the map, so this words the server's worst level for the hour when there is nothing to see (FE-09, FE-07).
// The region stays mounted and React rewrites it only when the words change, so playback does not spam screen readers.
export function HeatmapStatus({ heatmap, hourOffset }: HeatmapStatusProps) {
  const worstLevel = levelForDigit(riskDigitAt(heatmap.worst_level_by_hour, hourOffset))
  const iconLevel = worstLevel ?? 'no_data'
  return (
    <Stack
      role="status"
      direction="row"
      spacing={0.75}
      sx={{
        alignItems: 'center',
        alignSelf: 'flex-start',
        py: 0.25,
        px: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 4,
      }}
    >
      <RiskIcon level={iconLevel} sx={{ color: RISK_COLOURS[iconLevel], fontSize: '1.1rem' }} />
      <Typography variant="body2">{statusText(worstLevel)}</Typography>
    </Stack>
  )
}
