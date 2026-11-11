import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { RISK_COLOURS } from '../../shared/colours'
import { LEVEL_LABELS, RiskIcon } from '../../shared/risk'
import { formatClockTime, instantAfterHours } from '../../shared/time'
import type { CheckpointLevel, Heatmap } from '../../shared/types'
import { VISUALLY_HIDDEN_STYLE } from '../../shared/visuallyHidden'
import { levelForDigit, riskDigitAt } from './heatmapPaint'

interface HeatmapStatusProps {
  heatmap: Heatmap
  hourOffset: number
  timeZone: string
}

function worstWords(worstLevel: CheckpointLevel | null): string {
  if (worstLevel === null) {
    return 'no weather data'
  }
  return worstLevel === 'low' ? 'all clear' : `worst ${LEVEL_LABELS[worstLevel]}`
}

// Says what it describes: the corridor of all routes at the chosen clock hour, not where the truck is (the cards say that).
// Low is only a faint tint on the map, so this words the server's worst level for the hour (FE-09, FE-07).
// The clock hour is shown but kept out of the live region, which React rewrites only when the words change,
// so playback does not spam screen readers.
export function HeatmapStatus({ heatmap, hourOffset, timeZone }: HeatmapStatusProps) {
  const worstLevel = levelForDigit(riskDigitAt(heatmap.worst_level_by_hour, hourOffset))
  const iconLevel = worstLevel ?? 'no_data'
  const instant = instantAfterHours(heatmap.start_utc, hourOffset)
  const clock = formatClockTime(instant.toISOString(), timeZone)
  const words = worstWords(worstLevel)
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        position: 'relative',
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
      <Typography variant="body2" aria-hidden="true">
        {`Along the routes at ${clock}: ${words}`}
      </Typography>
      <Box role="status" sx={VISUALLY_HIDDEN_STYLE}>
        {`Along the routes: ${words}`}
      </Box>
    </Stack>
  )
}
