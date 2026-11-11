import List from '@mui/material/List'
import type { SxProps, Theme } from '@mui/material/styles'
import type { Route } from '../../shared/types'
import { CheckpointRow } from './CheckpointRow'
import { useRovingRows } from './useRovingRows'

// The list flows with the page: on every width the results already scroll, and a box inside them is a scroll trap.
const listBox: SxProps<Theme> = { border: 1, borderColor: 'divider', borderRadius: 1 }

interface CheckpointListProps {
  route: Route
  selectedCheckpointIndex: number | null
  highlightedCheckpointIndex: number | null
  onSelectCheckpoint: (routeId: string, checkpointIndex: number) => void
}

export function CheckpointList({
  route,
  selectedCheckpointIndex,
  highlightedCheckpointIndex,
  onSelectCheckpoint,
}: CheckpointListProps) {
  const { checkpoints } = route
  const selectedPosition = checkpoints.findIndex(({ index }) => index === selectedCheckpointIndex)
  const roving = useRovingRows(checkpoints.length, selectedPosition)

  return (
    <List dense aria-label="Checkpoints" onKeyDown={roving.moveFocus} sx={listBox}>
      {checkpoints.map((checkpoint, position) => (
        <CheckpointRow
          key={checkpoint.index}
          checkpoint={checkpoint}
          isSelected={checkpoint.index === selectedCheckpointIndex}
          isHighlighted={checkpoint.index === highlightedCheckpointIndex}
          isTabStop={position === roving.tabStopPosition}
          onFocus={() => {
            roving.rememberRow(position)
          }}
          onSelect={() => {
            onSelectCheckpoint(route.id, checkpoint.index)
          }}
        />
      ))}
    </List>
  )
}
