import { AppShell } from './app/AppShell'
import { Providers } from './app/Providers'
import { TripPlanner } from './app/TripPlanner'

export default function App() {
  return (
    <Providers>
      <AppShell>
        <TripPlanner />
      </AppShell>
    </Providers>
  )
}
