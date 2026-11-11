import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import Tooltip from '@mui/material/Tooltip'
import { MIN_TOUCH_TARGET_PX } from '../shared/constants'

import { PANEL_SLIDE_MS, PANEL_WIDTH_VARIABLE } from './panelWidth'

const HANDLE_WIDTH_PX = 24
const HANDLE_HEIGHT_PX = 56

// A tab on the panel's right edge that moves with it: over the map beside the open panel, or against
// the screen edge once the panel is hidden.
const Handle = styled(IconButton, { shouldForwardProp: (name) => name !== 'isCollapsed' })<{
  isCollapsed: boolean
}>(({ theme, isCollapsed }) => ({
  position: 'absolute',
  top: '50%',
  left: isCollapsed ? 0 : `var(${PANEL_WIDTH_VARIABLE})`,
  transform: 'translateY(-50%)',
  zIndex: theme.zIndex.mobileStepper,
  width: HANDLE_WIDTH_PX,
  minWidth: HANDLE_WIDTH_PX,
  height: HANDLE_HEIGHT_PX,
  borderRadius: `0 ${String(theme.shape.borderRadius)}px ${String(theme.shape.borderRadius)}px 0`,
  border: `1px solid ${theme.palette.divider}`,
  borderLeft: 0,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
  transition: `left ${String(PANEL_SLIDE_MS)}ms ease`,
  '@media (pointer: coarse)': { width: MIN_TOUCH_TARGET_PX, height: HANDLE_HEIGHT_PX },
}))

interface PanelToggleProps {
  isCollapsed: boolean
  panelId: string
  onToggle: () => void
}

export function PanelToggle({ isCollapsed, panelId, onToggle }: PanelToggleProps) {
  const label = isCollapsed ? 'Show results panel' : 'Hide results panel'
  return (
    <Tooltip title={label} placement="right">
      <Handle
        isCollapsed={isCollapsed}
        aria-label={label}
        aria-expanded={!isCollapsed}
        aria-controls={panelId}
        onClick={onToggle}
      >
        {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </Handle>
    </Tooltip>
  )
}
