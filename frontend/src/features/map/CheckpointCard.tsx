import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { LEVEL_LABELS, RiskIcon } from '../../shared/risk'
import { formatClockTime } from '../../shared/time'
import type { Checkpoint } from '../../shared/types'

interface CheckpointCardProps {
  checkpoint: Checkpoint
}

export function CheckpointCard({ checkpoint }: CheckpointCardProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <RiskIcon level={checkpoint.level} />
      <Box>
        <Typography variant="subtitle2">{LEVEL_LABELS[checkpoint.level]}</Typography>
        <Typography variant="caption">
          Mile {checkpoint.distance_miles},{' '}
          {formatClockTime(checkpoint.eta_utc, checkpoint.time_zone)}
        </Typography>
      </Box>
    </Stack>
  )
}
