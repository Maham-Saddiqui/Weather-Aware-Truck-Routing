import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ButtonBase from '@mui/material/ButtonBase'
import Typography from '@mui/material/Typography'
import { MIN_TOUCH_TARGET_PX } from '../../shared/constants'

export const CHECKPOINTS_TITLE_ID = 'checkpoints-title'
export const CHECKPOINTS_PANEL_ID = 'checkpoints-panel'

interface CheckpointsToggleProps {
  routeNumber: number
  checkpointCount: number
  isOpen: boolean
  onToggle: () => void
}

export function CheckpointsToggle({
  routeNumber,
  checkpointCount,
  isOpen,
  onToggle,
}: CheckpointsToggleProps) {
  const noun = checkpointCount === 1 ? 'checkpoint' : 'checkpoints'
  return (
    <Typography variant="h3" component="h3" id={CHECKPOINTS_TITLE_ID}>
      <ButtonBase
        aria-expanded={isOpen}
        aria-controls={CHECKPOINTS_PANEL_ID}
        onClick={onToggle}
        sx={{
          width: '100%',
          minHeight: MIN_TOUCH_TARGET_PX,
          gap: 1,
          justifyContent: 'space-between',
          textAlign: 'left',
          font: 'inherit',
        }}
      >
        <span>Checkpoints on Route {routeNumber}</span>
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {checkpointCount} {noun}
        </Typography>
        <ExpandMoreIcon sx={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </ButtonBase>
    </Typography>
  )
}
