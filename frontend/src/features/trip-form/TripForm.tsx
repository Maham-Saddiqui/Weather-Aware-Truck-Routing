import { useMediaQuery, useTheme } from '@mui/material'
import Stack from '@mui/material/Stack'
import { useState } from 'react'
import type { TripRequest } from '../../shared/types'
import { ExampleTrips } from './ExampleTrips'
import { TripFormFields } from './TripFormFields'
import { TripSummary } from './TripSummary'
import { useTripForm } from './useTripForm'

interface TripFormProps {
  initialTrip: TripRequest | null
  isBusy: boolean
  onSubmit: (trip: TripRequest) => void
}

export function TripForm({ initialTrip, isBusy, onSubmit }: TripFormProps) {
  const isPhone = useMediaQuery(useTheme().breakpoints.down('md'))
  const [isCollapsed, setIsCollapsed] = useState(false)
  const form = useTripForm(initialTrip, (trip) => {
    setIsCollapsed(true)
    onSubmit(trip)
  })

  if (isPhone && isCollapsed) {
    return (
      <TripSummary
        values={form.values}
        onEdit={() => {
          setIsCollapsed(false)
        }}
      />
    )
  }
  return (
    <Stack spacing={3}>
      <ExampleTrips isBusy={isBusy} onChoose={form.submitTrip} />
      <TripFormFields form={form} isBusy={isBusy} />
    </Stack>
  )
}
