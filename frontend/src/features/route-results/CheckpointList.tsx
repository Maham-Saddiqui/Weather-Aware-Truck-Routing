import List from '@mui/material/List'
import type { SxProps, Theme } from '@mui/material/styles'
import type { Route } from '../../shared/types'
import { CheckpointRow } from './CheckpointRow'
import { useRovingRows } from './useRovingRows'

// Only a wide screen scrolls the list inside the panel; on a phone a box inside the page is a scroll trap.
const listBox: SxProps<Theme> = (theme) => ({
  [theme.breakpoints.up('md')]: { maxHeight: 280, overflowY: 'auto' },
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
})

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
