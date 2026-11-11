import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import { describeError } from '../../shared/api/problems'

interface FailedResultsProps {
  error: unknown
  onRetry: () => void
}

export function FailedResults({ error, onRetry }: FailedResultsProps) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" onClick={onRetry}>
          Try again
        </Button>
      }
    >
      {describeError(error)}
    </Alert>
  )
}
