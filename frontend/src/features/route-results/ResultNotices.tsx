import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import type { WeatherStatus } from '../../shared/types'
import type { TripResults } from './tripResults'

interface Notice {
  severity: 'warning' | 'info'
  text: string
  canRetry?: boolean
}

const BACKUP_NOTICE: Notice = {
  severity: 'info',
  text: 'Backup routing is in use, so fewer route options may be shown.',
}

const ALTERNATIVES_NOTICE: Notice = {
  severity: 'info',
  text: 'Alternative routes are unavailable right now. Showing the main route only.',
}

const ONE_ROUTE_NOTICE: Notice = {
  severity: 'info',
  text: 'Only one route could be found for this trip.',
}

const WEATHER_NOTICES: Record<WeatherStatus, Notice | null> = {
  ok: null,
  partial: {
    severity: 'info',
    text: 'Some checkpoints have no weather data. Their miles are shown as "No data" and are never treated as safe.',
  },
  unavailable: {
    severity: 'warning',
    text: 'Weather data is unavailable right now. Routes are shown without ratings and no route is recommended.',
    canRetry: true,
  },
  busy: {
    severity: 'warning',
    text: 'Weather service busy, try again in a few minutes, or later if it stays busy',
    canRetry: true,
  },
}

function noticesFor(results: TripResults): Notice[] {
  const notices: Notice[] = []
  if (results.routingProvider === 'valhalla') notices.push(BACKUP_NOTICE)
  if (results.alternativesUnavailable) notices.push(ALTERNATIVES_NOTICE)
  if (results.phase === 'complete' && results.routes.length === 1) notices.push(ONE_ROUTE_NOTICE)
  const weatherNotice = results.weather && WEATHER_NOTICES[results.weather]
  if (weatherNotice) notices.push(weatherNotice)
  return notices
}

interface ResultNoticesProps {
  results: TripResults
  onRetry: () => void
}

export function ResultNotices({ results, onRetry }: ResultNoticesProps) {
  return (
    <Stack spacing={1} aria-live="polite">
      {noticesFor(results).map((notice) => (
        <Alert key={notice.text} severity={notice.severity}>
          {notice.text}
          {notice.canRetry && (
            <div>
              <Button
                color="inherit"
                variant="outlined"
                size="small"
                disabled={results.isPending}
                onClick={onRetry}
                sx={{ mt: 1.5 }}
              >
                Try again
              </Button>
            </div>
          )}
        </Alert>
      ))}
    </Stack>
  )
}
