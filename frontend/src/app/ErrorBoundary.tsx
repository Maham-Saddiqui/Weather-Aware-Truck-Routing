import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  area: string
  fallback?: ReactNode
  children: ReactNode
}

interface ErrorBoundaryState {
  hasFailed: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasFailed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasFailed: true }
  }

  render(): ReactNode {
    if (!this.state.hasFailed) return this.props.children
    if (this.props.fallback) return this.props.fallback
    return (
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            onClick={() => {
              this.setState({ hasFailed: false })
            }}
          >
            Try again
          </Button>
        }
      >
        Something went wrong while showing {this.props.area}.
      </Alert>
    )
  }
}
