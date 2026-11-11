import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { createQueryClient } from './queryClient'
import { theme } from './theme'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary area="the app">{children}</ErrorBoundary>
        </QueryClientProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}
