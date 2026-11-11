import Alert from '@mui/material/Alert'

export function MapUnavailable() {
  return (
    <Alert severity="warning" role="alert" sx={{ position: 'absolute', inset: '40% 16px auto' }}>
      The map could not load. Your routes and weather ratings are still listed next to it.
    </Alert>
  )
}
