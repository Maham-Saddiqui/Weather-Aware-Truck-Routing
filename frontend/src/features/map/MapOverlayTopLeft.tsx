import Stack from '@mui/material/Stack'
import { MapLegend } from './MapLegend'
import { RouteColourKey } from './RouteColourKey'

interface MapOverlayTopLeftProps {
  routeCount: number
}

// The legend and the phone colour key share one column, so opening the legend's details pushes the key down
// instead of covering it. The zoom buttons on the right keep their 64 px.
export function MapOverlayTopLeft({ routeCount }: MapOverlayTopLeftProps) {
  return (
    <Stack
      sx={{
        gap: 0.5,
        position: 'absolute',
        top: 8,
        left: 8,
        maxWidth: 'calc(100% - 64px)',
        alignItems: 'flex-start',
      }}
    >
      <MapLegend />
      {routeCount > 1 && <RouteColourKey routeCount={routeCount} />}
    </Stack>
  )
}
