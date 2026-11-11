import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import { formatLocalTime } from '../../shared/time'
import type { Route } from '../../shared/types'
import { RiskChip } from './RiskChip'

interface CheckpointListProps {
  route: Route
  selectedCheckpointIndex: number | null
  onSelectCheckpoint: (routeId: string, checkpointIndex: number) => void
}

export function CheckpointList({
  route,
  selectedCheckpointIndex,
  onSelectCheckpoint,
}: CheckpointListProps) {
  return (
    <List dense sx={{ maxHeight: 280, overflowY: 'auto' }} aria-label="Checkpoints">
      {route.checkpoints.map((checkpoint) => (
        <ListItemButton
          key={checkpoint.index}
          selected={checkpoint.index === selectedCheckpointIndex}
          onClick={() => {
            onSelectCheckpoint(route.id, checkpoint.index)
          }}
        >
          <ListItemText
            primary={`Mile ${checkpoint.distance_miles}`}
            secondary={formatLocalTime(checkpoint.eta_utc, checkpoint.time_zone)}
          />
          <RiskChip level={checkpoint.level} />
        </ListItemButton>
      ))}
    </List>
  )
}
