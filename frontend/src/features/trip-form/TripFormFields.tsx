import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { useEffect, useRef } from 'react'
import { PlacePair } from './PlacePair'
import { TripDetailsFields } from './TripDetailsFields'
import type { useTripForm } from './useTripForm'

interface TripFormFieldsProps {
  form: ReturnType<typeof useTripForm>
  isBusy: boolean
}

// The date picker marks its wrapper invalid; the wrapper cannot take focus, so focus its first editable part.
function focusFirstInvalidField(form: HTMLFormElement) {
  const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]')
  const target = invalid?.querySelector<HTMLElement>('[role="spinbutton"]') ?? invalid
  target?.focus()
}

export function TripFormFields({ form, isBusy }: TripFormFieldsProps) {
  const { values, errors, change, rejectedSubmits } = form
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (rejectedSubmits > 0 && formRef.current) focusFirstInvalidField(formRef.current)
  }, [rejectedSubmits])
  return (
    <Stack
      component="form"
      ref={formRef}
      noValidate
      spacing={2}
      aria-label="Plan a trip"
      onSubmit={(event) => {
        event.preventDefault()
        form.submit()
      }}
    >
      <PlacePair
        origin={values.origin}
        destination={values.destination}
        errors={errors}
        onChangeOrigin={(origin) => {
          change({ origin })
        }}
        onChangeDestination={(destination) => {
          change({ destination })
        }}
        onSwap={form.swapPlaces}
      />
      <TripDetailsFields form={form} />
      <Button type="submit" variant="contained" size="large" disabled={isBusy}>
        {isBusy ? 'Planning…' : 'Plan route'}
      </Button>
    </Stack>
  )
}
