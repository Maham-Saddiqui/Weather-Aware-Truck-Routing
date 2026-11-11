import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { CheckpointDetails } from './CheckpointDetails'
import { CheckpointList } from './CheckpointList'
import { CHECKPOINTS_PANEL_ID } from './CheckpointsToggle'

type ListProps = Parameters<typeof CheckpointList>[0]

export function CheckpointPanel(list: ListProps) {
  const selected = list.route.checkpoints.find(
    ({ index }) => index === list.selectedCheckpointIndex,
  )
  return (
    <Stack spacing={1} id={CHECKPOINTS_PANEL_ID}>
      <div aria-live="polite">
        {selected ? (
          <CheckpointDetails checkpoint={selected} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Select a checkpoint to see its wind, rain, snow and estimated arrival.
          </Typography>
        )}
      </div>
      <CheckpointList key={list.route.id} {...list} />
    </Stack>
  )
}
