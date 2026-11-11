import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { Route } from '../../shared/types'
import { CheckpointDetails } from './CheckpointDetails'
import { CheckpointList } from './CheckpointList'

interface CheckpointSectionProps {
  route: Route
  routeNumber: number
  selectedCheckpointIndex: number | null
  onSelectCheckpoint: (routeId: string, checkpointIndex: number) => void
}

export function CheckpointSection({ routeNumber, ...list }: CheckpointSectionProps) {
  const selected = list.route.checkpoints.find(
    (checkpoint) => checkpoint.index === list.selectedCheckpointIndex,
  )
  return (
    <Stack spacing={1} component="section" aria-labelledby="checkpoints-title">
      <Typography id="checkpoints-title" variant="h3" component="h3">
        Checkpoints on Route {routeNumber}
      </Typography>
      <div aria-live="polite">
        {selected ? (
          <CheckpointDetails checkpoint={selected} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Select a checkpoint to see its wind, rain, snow and estimated arrival.
          </Typography>
        )}
      </div>
      <CheckpointList {...list} />
    </Stack>
  )
}
