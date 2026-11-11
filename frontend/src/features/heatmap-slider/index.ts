import { lazy } from 'react'

// Needed only once results exist, so it stays out of the first download.
export const HeatmapSlider = lazy(() =>
  import('./HeatmapSlider').then((module) => ({ default: module.HeatmapSlider })),
)
