import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import { formatLocalTime } from '../../shared/time'
import type { Route } from '../../shared/types'
import { RiskChip } from './RiskChip'
import { useRovingRows } from './useRovingRows'

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
  const { checkpoints } = route
  const selectedPosition = checkpoints.findIndex(({ index }) => index === selectedCheckpointIndex)
  const roving = useRovingRows(checkpoints.length, selectedPosition)

  return (
    <List
      dense
      aria-label="Checkpoints"
      onKeyDown={roving.moveFocus}
      sx={{ maxHeight: 280, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}
    >
      {checkpoints.map((checkpoint, position) => (
        <ListItem key={checkpoint.index} disablePadding>
          <ListItemButton
            selected={checkpoint.index === selectedCheckpointIndex}
            aria-current={checkpoint.index === selectedCheckpointIndex ? 'true' : undefined}
            tabIndex={position === roving.tabStopPosition ? 0 : -1}
            onFocus={() => {
              roving.rememberRow(position)
            }}
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
        </ListItem>
      ))}
    </List>
  )
}
