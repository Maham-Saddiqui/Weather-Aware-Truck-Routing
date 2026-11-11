import type { ReactNode } from 'react'
import type { components } from './api/generated/schema'

export type Route = components['schemas']['Route']
export type Checkpoint = components['schemas']['Checkpoint']
export type Heatmap = components['schemas']['Heatmap']
export type RoutingProvider = components['schemas']['RoutingProvider']

export interface RouteMapProps {
  routes: readonly Route[]
  selectedRouteId: string | null
  selectedCheckpointIndex: number | null
  heatmap: Heatmap | null
  hourOffset: number
  onSelectRoute: (routeId: string) => void
  onSelectCheckpoint: (routeId: string, checkpointIndex: number) => void
}

export interface HeatmapSliderProps {
  startUtc: string
  timeZone: string
  hours: number
  hourOffset: number
  playUntilHour: number
  onChangeHourOffset: (hourOffset: number) => void
  status?: ReactNode
}

export type Place = components['schemas']['Place']
export type TripRequest = components['schemas']['TripRequest']
export type SpacingMiles = TripRequest['spacing_miles']
export type CheckpointLevel = components['schemas']['CheckpointLevel']
export type WeatherStatus = components['schemas']['WeatherStatus']['status']
export type Recommendation = components['schemas']['Recommendation']
export type Problem = components['schemas']['Problem']
export type PrimaryTripResponse = components['schemas']['PrimaryTripResponse']
export type CompareTripResponse = components['schemas']['CompareTripResponse']

export interface TripRun {
  trip: TripRequest
  runId: number
}
