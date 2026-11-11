import Autocomplete from '@mui/material/Autocomplete'
import type { AutocompleteRenderInputParams } from '@mui/material/Autocomplete'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import { useState } from 'react'
import { describeError, ApiError } from '../../shared/api/problems'
import { SUGGESTION_MIN_CHARACTERS } from '../../shared/constants'
import { EndpointLetter } from '../../shared/EndpointLetter'
import type { EndpointLetterName } from '../../shared/EndpointLetter'
import type { Place } from '../../shared/types'
import { usePlaceSuggestions } from './usePlaceSuggestions'

interface PlaceFieldProps {
  label: string
  letter: EndpointLetterName
  value: Place | null
  error: string | undefined
  onChange: (place: Place | null) => void
}

const SUGGESTIONS_UNAVAILABLE = describeError(new ApiError('suggestions_unavailable'))

function noOptionsMessage(typedText: string, hasFailed: boolean): string {
  if (hasFailed) return SUGGESTIONS_UNAVAILABLE
  if (typedText.trim().length < SUGGESTION_MIN_CHARACTERS) {
    return `Type at least ${String(SUGGESTION_MIN_CHARACTERS)} characters`
  }
  return 'No US places found. Try a different spelling.'
}

function withLetter(
  slotProps: AutocompleteRenderInputParams['slotProps'],
  letter: EndpointLetterName,
) {
  return {
    ...slotProps,
    input: {
      ...slotProps.input,
      startAdornment: (
        <InputAdornment position="start">
          <EndpointLetter letter={letter} />
        </InputAdornment>
      ),
    },
  }
}

export function PlaceField({ label, letter, value, error, onChange }: PlaceFieldProps) {
  const [typedText, setTypedText] = useState(value?.label ?? '')
  const { options, isSearching, hasFailed } = usePlaceSuggestions(typedText, value?.label)

  return (
    <Autocomplete
      options={options}
      value={value}
      inputValue={typedText}
      onInputChange={(_event, text) => {
        setTypedText(text)
      }}
      onChange={(_event, place) => {
        onChange(place)
      }}
      getOptionLabel={(place) => place.label}
      isOptionEqualToValue={(a, b) => a.lat === b.lat && a.lon === b.lon}
      filterOptions={(all) => all}
      loading={isSearching}
      loadingText="Searching…"
      noOptionsText={noOptionsMessage(typedText, hasFailed)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          slotProps={withLetter(params.slotProps, letter)}
          error={error !== undefined}
          helperText={
            error ?? (hasFailed ? SUGGESTIONS_UNAVAILABLE : 'Choose a suggestion from the list')
          }
        />
      )}
    />
  )
}
