import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { PlacePair } from './PlacePair'
import { TripDetailsFields } from './TripDetailsFields'
import type { useTripForm } from './useTripForm'

interface TripFormFieldsProps {
  form: ReturnType<typeof useTripForm>
  isBusy: boolean
}

export function TripFormFields({ form, isBusy }: TripFormFieldsProps) {
  const { values, errors, change } = form
  return (
    <Stack
      component="form"
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
