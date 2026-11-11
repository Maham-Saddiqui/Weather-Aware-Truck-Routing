import { useEffect, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

type ServerStatus = 'checking' | 'ok' | 'unreachable'

export default function App() {
  const [serverStatus, setServerStatus] = useState<ServerStatus>('checking')

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/health`)
      .then((response) => {
        setServerStatus(response.ok ? 'ok' : 'unreachable')
      })
      .catch(() => {
        setServerStatus('unreachable')
      })
  }, [])

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Weather-Aware Truck Routing</h1>
      <p>Server: {serverStatus}</p>
    </main>
  )
}
