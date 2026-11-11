import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import { formatLocalTime } from '../../shared/time'
import type { Checkpoint } from '../../shared/types'
import { RiskChip } from './RiskChip'

interface CheckpointRowProps {
  checkpoint: Checkpoint
  isSelected: boolean
  isHighlighted: boolean
  isTabStop: boolean
  onFocus: () => void
  onSelect: () => void
}

export function CheckpointRow({
  checkpoint,
  isSelected,
  isHighlighted,
  isTabStop,
  onFocus,
  onSelect,
}: CheckpointRowProps) {
  return (
    <ListItem disablePadding>
      <ListItemButton
        selected={isSelected}
        aria-current={isSelected ? 'true' : undefined}
        tabIndex={isTabStop ? 0 : -1}
        onFocus={onFocus}
        onClick={onSelect}
        sx={
          isHighlighted
            ? {
                outline: 2,
                outlineColor: 'primary.light',
                outlineOffset: -2,
                bgcolor: 'action.hover',
              }
            : undefined
        }
      >
        <ListItemText
          primary={`Mile ${checkpoint.distance_miles}`}
          secondary={formatLocalTime(checkpoint.eta_utc, checkpoint.time_zone)}
        />
        <RiskChip level={checkpoint.level} />
      </ListItemButton>
    </ListItem>
  )
}
