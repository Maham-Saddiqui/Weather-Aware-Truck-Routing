import type { Dayjs } from 'dayjs'
import { MAX_DEPARTURE_DAYS_AHEAD, MAX_LOAD_LB } from '../../shared/constants'
import type { Place, SpacingMiles, TripRequest } from '../../shared/types'

export interface TripFormValues {
  origin: Place | null
  destination: Place | null
  departure: Dayjs | null
  loadLb: string
  spacingMiles: SpacingMiles
}

export type TripFormErrors = Partial<
  Record<'origin' | 'destination' | 'departure' | 'loadLb', string>
>

export type TripFormCheck =
  { isValid: true; trip: TripRequest } | { isValid: false; errors: TripFormErrors }

export function parseLoad(text: string): number | null {
  const digits = text.replace(/[,\s]/g, '')
  return /^\d+$/.test(digits) ? Number(digits) : null
}

function placeErrors({ origin, destination }: TripFormValues): TripFormErrors {
  return {
    origin: origin ? undefined : 'Choose an origin from the suggestions.',
    destination: destinationError(origin, destination),
  }
}

function destinationError(origin: Place | null, destination: Place | null): string | undefined {
  if (!destination) return 'Choose a destination from the suggestions.'
  const isSamePlace = origin?.lat === destination.lat && origin.lon === destination.lon
  return isSamePlace ? 'Origin and destination must be different places.' : undefined
}

export function departureError(departure: Dayjs | null, now: Dayjs): string | undefined {
  if (!departure?.isValid()) return 'Pick a departure date and time.'
  if (departure.isBefore(now.startOf('hour'))) return 'Departure cannot be in the past.'
  if (departure.isAfter(now.add(MAX_DEPARTURE_DAYS_AHEAD, 'day'))) {
    return `Departure must be within the next ${String(MAX_DEPARTURE_DAYS_AHEAD)} days.`
  }
  return undefined
}

function loadError(text: string): string | undefined {
  const load = parseLoad(text)
  if (load === null) return 'Enter the cargo weight in pounds, for example 42000.'
  if (load > MAX_LOAD_LB)
    return `Cargo weight can be at most ${MAX_LOAD_LB.toLocaleString('en-US')} lb.`
  return undefined
}

export function checkTripForm(values: TripFormValues, now: Dayjs): TripFormCheck {
  const errors: TripFormErrors = {
    ...placeErrors(values),
    departure: departureError(values.departure, now),
    loadLb: loadError(values.loadLb),
  }
  const { origin, destination, departure } = values
  const load = parseLoad(values.loadLb)
  if (
    !origin ||
    !destination ||
    !departure ||
    load === null ||
    Object.values(errors).some(Boolean)
  ) {
    return { isValid: false, errors }
  }
  return {
    isValid: true,
    trip: {
      origin,
      destination,
      departure_utc: departure.toISOString(),
      load_lb: load,
      spacing_miles: values.spacingMiles,
    },
  }
}
