import { skipToken, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../../shared/api/client'
import { DEFAULT_SPACING_MILES } from '../../shared/constants'
import { browserTimeZone, dayjs, tomorrowMorning } from '../../shared/time'
import type { Place, TripRequest } from '../../shared/types'
import { checkTripForm, type TripFormErrors, type TripFormValues } from './validation'

function defaultValues(): TripFormValues {
  return {
    origin: null,
    destination: null,
    departure: tomorrowMorning(dayjs(), browserTimeZone()),
    loadLb: '',
    spacingMiles: DEFAULT_SPACING_MILES,
  }
}

function valuesFromTrip(trip: TripRequest): TripFormValues {
  return {
    origin: trip.origin,
    destination: trip.destination,
    departure: dayjs(trip.departure_utc),
    loadLb: String(trip.load_lb),
    spacingMiles: trip.spacing_miles,
  }
}

function useOriginTimeZone(origin: Place | null): string {
  const lookup = useQuery({
    queryKey: ['timezone', origin?.lat, origin?.lon],
    queryFn: origin ? ({ signal }) => api.getTimeZone(origin, signal) : skipToken,
  })
  return lookup.data?.time_zone ?? browserTimeZone()
}

export function useTripForm(
  initialTrip: TripRequest | null,
  onSubmit: (trip: TripRequest) => void,
) {
  const [values, setValues] = useState(() =>
    initialTrip ? valuesFromTrip(initialTrip) : defaultValues(),
  )
  const [hasAttempted, setHasAttempted] = useState(false)
  const timeZone = useOriginTimeZone(values.origin)

  const check = checkTripForm(values, dayjs())
  const errors: TripFormErrors = hasAttempted && !check.isValid ? check.errors : {}

  return {
    values,
    errors,
    timeZone,
    change: (changes: Partial<TripFormValues>) => {
      setValues((previous) => ({ ...previous, ...changes }))
    },
    swapPlaces: () => {
      setValues((previous) => ({
        ...previous,
        origin: previous.destination,
        destination: previous.origin,
      }))
    },
    submit: () => {
      setHasAttempted(true)
      if (check.isValid) onSubmit(check.trip)
    },
    submitTrip: (trip: TripRequest) => {
      setValues(valuesFromTrip(trip))
      onSubmit(trip)
    },
  }
}
