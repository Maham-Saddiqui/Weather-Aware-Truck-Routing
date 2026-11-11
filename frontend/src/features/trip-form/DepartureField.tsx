import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import type { Dayjs } from 'dayjs'
import { zoneAbbreviation } from '../../shared/time'

interface DepartureFieldProps {
  value: Dayjs | null
  timeZone: string
  hasOrigin: boolean
  error: string | undefined
  onChange: (departure: Dayjs | null) => void
}

function zoneHint(value: Dayjs | null, timeZone: string, hasOrigin: boolean): string {
  const abbreviation = zoneAbbreviation(
    value?.isValid() ? value.toISOString() : new Date().toISOString(),
    timeZone,
  )
  return hasOrigin
    ? `Local time at the origin (${abbreviation})`
    : `Your time zone (${abbreviation}) until you choose an origin`
}

export function DepartureField({
  value,
  timeZone,
  hasOrigin,
  error,
  onChange,
}: DepartureFieldProps) {
  return (
    <DateTimePicker
      label="Departure"
      value={value}
      timezone={timeZone}
      ampm={false}
      onChange={onChange}
      slotProps={{
        textField: {
          error: error !== undefined,
          helperText: error ?? zoneHint(value, timeZone, hasOrigin),
        },
      }}
    />
  )
}
