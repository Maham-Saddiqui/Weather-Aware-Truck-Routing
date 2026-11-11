import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { LEVEL_LABELS, LEVEL_ORDER } from '../../shared/risk'
import type { Heatmap } from '../../shared/types'
import { worstLevelAtHour } from './heatmapPaint'
import { LegendItem } from './LegendItem'

interface MapLegendProps {
  heatmap: Heatmap | null
  hourOffset: number
}

function heatmapSummary(heatmap: Heatmap, hourOffset: number): string {
  const worstLevel = worstLevelAtHour(heatmap, hourOffset)
  return worstLevel === null
    ? 'Heatmap: no data at this hour'
    : `Heatmap now: worst ${LEVEL_LABELS[worstLevel]}`
}

export function MapLegend({ heatmap, hourOffset }: MapLegendProps) {
  return (
    <Paper
      component="section"
      aria-label="Risk legend"
      elevation={3}
      sx={{
        position: 'absolute',
        top: 8,
        left: 8,
        maxWidth: 'calc(100% - 64px)',
        p: 1,
        opacity: 0.95,
      }}
    >
      <Stack
        component="ul"
        direction="row"
        useFlexGap
        sx={{ flexWrap: 'wrap', gap: 1, m: 0, p: 0, listStyle: 'none' }}
      >
        {LEVEL_ORDER.map((level) => (
          <LegendItem key={level} level={level} />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        Grey stretches on the map have no weather data.
      </Typography>
      {heatmap && (
        <Typography variant="caption" role="status" sx={{ display: 'block', mt: 0.5 }}>
          {heatmapSummary(heatmap, hourOffset)}
        </Typography>
      )}
    </Paper>
  )
}
