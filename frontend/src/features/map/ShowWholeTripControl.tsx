import FitScreenIcon from '@mui/icons-material/FitScreen'
import Tooltip from '@mui/material/Tooltip'
import { useControl } from '@vis.gl/react-maplibre'
import type { IControl } from 'maplibre-gl'
import type { MouseEvent } from 'react'
import { createPortal } from 'react-dom'

const LABEL = 'Show whole trip'

// A control group of its own, so the map's zoom-button styling (dark theme, 44 px on touch) applies unchanged.
class ControlSlot implements IControl {
  readonly element = document.createElement('div')

  constructor() {
    this.element.className = 'maplibregl-ctrl maplibregl-ctrl-group'
  }

  onAdd() {
    return this.element
  }

  onRemove() {
    this.element.remove()
  }
}

interface ShowWholeTripControlProps {
  onPress: (event: Event) => void
}

// Added after the zoom buttons, so it sits directly under them at the top right.
export function ShowWholeTripControl({ onPress }: ShowWholeTripControlProps) {
  const slot = useControl(() => new ControlSlot(), { position: 'top-right' })
  return createPortal(
    <Tooltip title={LABEL} placement="left">
      <button
        type="button"
        onClick={(event: MouseEvent) => {
          onPress(event.nativeEvent)
        }}
      >
        <FitScreenIcon
          fontSize="small"
          sx={{ display: 'block', margin: 'auto', color: 'common.white' }}
        />
      </button>
    </Tooltip>,
    slot.element,
  )
}
