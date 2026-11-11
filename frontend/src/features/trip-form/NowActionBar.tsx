import Button from '@mui/material/Button'
import DialogActions from '@mui/material/DialogActions'
import { usePickerContext } from '@mui/x-date-pickers/hooks'
import type { PickersActionBarProps } from '@mui/x-date-pickers/PickersActionBar'
import { dayjs } from '../../shared/time'
import { departureWindow } from './validation'

export function NowActionBar({ className }: PickersActionBarProps) {
  const { timezone, setValue, cancelValueChanges, acceptValueChanges } = usePickerContext()
  const chooseCurrentHour = () => {
    setValue(departureWindow(dayjs()).earliest.tz(timezone), { source: 'view' })
  }
  return (
    <DialogActions className={className}>
      <Button onClick={chooseCurrentHour}>Now</Button>
      <Button onClick={cancelValueChanges}>Cancel</Button>
      <Button onClick={acceptValueChanges}>OK</Button>
    </DialogActions>
  )
}
