import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App skeleton', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the server as ok when the health check answers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    render(<App />)

    expect(await screen.findByText('Server: ok')).toBeInTheDocument()
  })

  it('says the server is unreachable when the health check fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    render(<App />)

    expect(await screen.findByText('Server: unreachable')).toBeInTheDocument()
  })
})
