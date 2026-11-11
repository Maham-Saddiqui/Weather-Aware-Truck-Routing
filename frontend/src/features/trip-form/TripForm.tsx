import type { TripRequest } from '../../shared/types'
import { ExampleTrips } from './ExampleTrips'

interface TripFormProps {
  onSubmit: (trip: TripRequest) => void
}

export function TripForm({ onSubmit }: TripFormProps) {
  return <ExampleTrips onChoose={onSubmit} />
}
