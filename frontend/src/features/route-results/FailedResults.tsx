import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import { describeError } from '../../shared/api/problems'

interface FailedResultsProps {
  error: unknown
  onRetry: () => void
}

// The button sits under the message, not beside it, so a long message keeps the full width on a phone.
export function FailedResults({ error, onRetry }: FailedResultsProps) {
  return (
    <Alert severity="error">
      <AlertTitle>The trip could not be planned</AlertTitle>
      {describeError(error)}
      <div>
        <Button color="inherit" variant="outlined" size="small" onClick={onRetry} sx={{ mt: 1.5 }}>
          Try again
        </Button>
      </div>
    </Alert>
  )
}
