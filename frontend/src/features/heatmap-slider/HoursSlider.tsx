import Slider from '@mui/material/Slider'
import { useId } from 'react'
import { VISUALLY_HIDDEN_STYLE } from '../../shared/visuallyHidden'
import { arrivalLabelLeft, arrivalMarkFor } from './arrivalMark'

const SLIDER_MIN_WIDTH_PX = 160
const ARRIVAL_TICK_HEIGHT_PX = 16

const arrivalMarkStyle = {
  '& .MuiSlider-mark': {
    width: 3,
    height: ARRIVAL_TICK_HEIGHT_PX,
    borderRadius: 0,
    backgroundColor: 'text.primary',
    opacity: 1,
  },
  '& .MuiSlider-markLabel': { color: 'text.primary', fontWeight: 600 },
}

interface HoursSliderProps {
  hourOffset: number
  lastHour: number
  arrivalHour: number
  labelFor: (hour: number) => string
  onChange: (hourOffset: number) => void
}

// The mark shows where the trip arrives, so the hours after it read as part of the same slider.
export function HoursSlider({
  hourOffset,
  lastHour,
  arrivalHour,
  labelFor,
  onChange,
}: HoursSliderProps) {
  const arrivalMark = arrivalMarkFor(arrivalHour, lastHour)
  const descriptionId = useId()
  return (
    <>
      <Slider
        aria-label="Hours after departure"
        min={0}
        max={lastHour}
        step={1}
        value={hourOffset}
        getAriaValueText={labelFor}
        marks={arrivalMark ? [{ value: arrivalMark.hour, label: 'Arrival' }] : false}
        slotProps={{
          input: { 'aria-describedby': arrivalMark ? descriptionId : undefined },
          markLabel: { style: arrivalMark ? { left: arrivalLabelLeft(arrivalMark.percent) } : {} },
        }}
        sx={{ flex: `1 1 ${String(SLIDER_MIN_WIDTH_PX)}px`, ...arrivalMarkStyle }}
        onChange={(_event, value) => {
          onChange(value)
        }}
      />
      {arrivalMark && (
        <span id={descriptionId} style={VISUALLY_HIDDEN_STYLE}>
          {arrivalMark.description}
        </span>
      )}
    </>
  )
}
