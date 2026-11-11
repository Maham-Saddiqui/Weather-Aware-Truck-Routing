import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import type { Dayjs } from 'dayjs'
import { dayjs, zoneAbbreviation } from '../../shared/time'
import type { OriginZone, OriginZoneState } from './useOriginTimeZone'
import { DEPARTURE_WINDOW_HINT, departureWindow } from './validation'

interface DepartureFieldProps {
  value: Dayjs | null
  zone: OriginZone
  error: string | undefined
  onChange: (departure: Dayjs | null) => void
}

function zoneHint(value: Dayjs | null, { state, timeZone }: OriginZone): string {
  const abbreviation = zoneAbbreviation(
    value?.isValid() ? value.toISOString() : new Date().toISOString(),
    timeZone,
  )
  const hints: Record<OriginZoneState, string> = {
    no_origin: `Your time zone (${abbreviation}) until you choose an origin`,
    finding: 'Finding the origin’s time zone…',
    failed: 'We could not find the origin’s time zone.',
    found: `Local time at the origin (${abbreviation})`,
  }
  return hints[state]
}

function helperLines(value: Dayjs | null, zone: OriginZone) {
  return (
    <>
      <Box component="span" sx={{ display: 'block' }}>
        {zoneHint(value, zone)}
      </Box>
      <Box component="span" sx={{ display: 'block' }}>
        {DEPARTURE_WINDOW_HINT}
      </Box>
    </>
  )
}

export function DepartureField({ value, zone, error, onChange }: DepartureFieldProps) {
  const { earliest, latest } = departureWindow(dayjs())
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateTimePicker
        label="Departure"
        value={value}
        timezone={zone.timeZone}
        ampm={false}
        minDateTime={earliest.tz(zone.timeZone)}
        maxDateTime={latest.tz(zone.timeZone)}
        onChange={onChange}
        slotProps={{
          textField: {
            error: error !== undefined,
            helperText: error ?? helperLines(value, zone),
          },
        }}
      />
      {zone.state === 'failed' && (
        <Button variant="outlined" size="small" onClick={zone.retry}>
          Look up the time zone again
        </Button>
      )}
    </LocalizationProvider>
  )
}
