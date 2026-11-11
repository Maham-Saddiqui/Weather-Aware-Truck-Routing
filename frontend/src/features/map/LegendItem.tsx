import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { RISK_COLOURS } from '../../shared/colours'
import { LEVEL_LABELS, RiskIcon } from '../../shared/risk'
import type { CheckpointLevel } from '../../shared/types'

interface LegendItemProps {
  level: CheckpointLevel
}

export function LegendItem({ level }: LegendItemProps) {
  return (
    <Stack component="li" direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <RiskIcon level={level} fontSize="small" sx={{ color: RISK_COLOURS[level] }} />
      <Typography variant="caption">{LEVEL_LABELS[level]}</Typography>
    </Stack>
  )
}
