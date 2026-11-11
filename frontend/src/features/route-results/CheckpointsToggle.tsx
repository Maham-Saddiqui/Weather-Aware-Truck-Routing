import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ButtonBase from '@mui/material/ButtonBase'
import Typography from '@mui/material/Typography'
import { MIN_TOUCH_TARGET_PX } from '../../shared/constants'

interface CheckpointsToggleProps {
  titleId: string
  panelId: string
  routeNumber: number
  checkpointCount: number
  isOpen: boolean
  onToggle: () => void
}

export function CheckpointsToggle({
  titleId,
  panelId,
  routeNumber,
  checkpointCount,
  isOpen,
  onToggle,
}: CheckpointsToggleProps) {
  const noun = checkpointCount === 1 ? 'checkpoint' : 'checkpoints'
  return (
    <Typography variant="h3" component="h3" id={titleId}>
      <ButtonBase
        aria-expanded={isOpen}
        aria-controls={panelId}
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
