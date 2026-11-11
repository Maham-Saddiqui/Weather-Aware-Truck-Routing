import TextField from '@mui/material/TextField'
import { MAX_LOAD_LB, TYPICAL_LEGAL_LOAD_LB } from '../../shared/constants'
import { parseLoad } from './validation'

interface LoadFieldProps {
  value: string
  error: string | undefined
  onChange: (text: string) => void
}

function helperText(value: string, error: string | undefined): string {
  if (error) return error
  const load = parseLoad(value)
  if (load !== null && load > TYPICAL_LEGAL_LOAD_LB) {
    return 'Above typical legal cargo. You can still plan this trip.'
  }
  return `Cargo only, 0 to ${MAX_LOAD_LB.toLocaleString('en-US')} lb`
}

export function LoadField({ value, error, onChange }: LoadFieldProps) {
  return (
    <TextField
      label="Cargo weight (lb)"
      value={value}
      error={error !== undefined}
      helperText={helperText(value, error)}
      onChange={(event) => {
        onChange(event.target.value)
      }}
      slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }}
    />
  )
}
