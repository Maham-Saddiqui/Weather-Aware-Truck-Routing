import type { TooltipProps } from '@mui/material/Tooltip'

// The slider dock holds the caption and status above the Play row, so these tooltips rise clear of the whole dock
// instead of covering the "Forecast time" caption or the status.
const LIFT_ABOVE_DOCK_PX = 52

export const TOOLTIP_ABOVE_DOCK: Pick<TooltipProps, 'placement' | 'slotProps'> = {
  placement: 'top',
  slotProps: {
    popper: { modifiers: [{ name: 'offset', options: { offset: [0, LIFT_ABOVE_DOCK_PX] } }] },
  },
}
