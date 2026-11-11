import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/Providers'
import { ShareTrip } from './ShareTrip'

const TRIP_ADDRESS =
  '/?o=Chicago&olat=41.8781&olon=-87.6298&d=Denver&dlat=39.7392&dlon=-104.9903&dep=2026-11-12T14:00:00.000Z&load=42000&spacing=25'

function stubBrowser(name: 'clipboard' | 'share', value: unknown) {
  Object.defineProperty(navigator, name, { value, configurable: true })
}

async function press(name: string) {
  await act(() => {
    fireEvent.click(screen.getByRole('button', { name }))
    return Promise.resolve()
  })
}

function renderShare() {
  render(
    <Providers>
      <ShareTrip />
    </Providers>,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  window.history.replaceState(null, '', TRIP_ADDRESS)
})

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'clipboard')
  Reflect.deleteProperty(navigator, 'share')
  window.history.replaceState(null, '', '/')
})

describe('copying the trip link (REQ-14)', () => {
  it('copies the exact address with the trip and says "Link copied"', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubBrowser('clipboard', { writeText })
    renderShare()

    await press('Copy link')

    expect(writeText).toHaveBeenCalledExactlyOnceWith(window.location.href)
    expect(writeText.mock.calls[0]?.[0]).toContain('olat=41.8781&olon=-87.6298')
    expect(screen.getByRole('status')).toHaveTextContent('Link copied')
  })

  it('removes the "Link copied" message after a few seconds', async () => {
    stubBrowser('clipboard', { writeText: vi.fn().mockResolvedValue(undefined) })
    renderShare()
    await press('Copy link')

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('says the copy failed and offers the link in a read-only field to select', async () => {
    stubBrowser('clipboard', { writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    renderShare()

    await press('Copy link')

    expect(screen.getByRole('status')).toHaveTextContent('The link could not be copied')
    const field = screen.getByRole<HTMLInputElement>('textbox', { name: 'Trip link' })
    expect(field).toHaveAttribute('readonly')
    expect(field.value).toBe(window.location.href)
  })

  it('falls back to the read-only field when the browser has no clipboard', async () => {
    renderShare()

    await press('Copy link')

    expect(screen.getByRole('textbox', { name: 'Trip link' })).toBeInTheDocument()
  })
})

describe('sharing the trip link (REQ-14)', () => {
  it('offers "Share trip" and hands the address to the device share sheet', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubBrowser('share', share)
    renderShare()

    await press('Share trip')

    expect(share).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ url: window.location.href }),
    )
  })

  it('shows "Copy link" next to "Share trip" so the link can be copied where a share sheet exists (REQ-16)', () => {
    stubBrowser('share', vi.fn())
    renderShare()

    expect(screen.getByRole('button', { name: 'Share trip' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeVisible()
  })

  it('offers only "Copy link" when the device has no share sheet', () => {
    renderShare()

    expect(screen.queryByRole('button', { name: 'Share trip' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeVisible()
  })

  it('copies without opening the share sheet when "Copy link" is pressed', async () => {
    const share = vi.fn()
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubBrowser('share', share)
    stubBrowser('clipboard', { writeText })
    renderShare()

    await press('Copy link')

    expect(share).not.toHaveBeenCalled()
    expect(writeText).toHaveBeenCalledExactlyOnceWith(window.location.href)
  })

  it('stays quiet when the driver closes the share sheet', async () => {
    const closed = new DOMException('closed', 'AbortError')
    stubBrowser('share', vi.fn().mockRejectedValue(closed))
    renderShare()

    await press('Share trip')

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('copies the link instead when sharing breaks', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubBrowser('clipboard', { writeText })
    stubBrowser('share', vi.fn().mockRejectedValue(new Error('broken')))
    renderShare()

    await press('Share trip')

    expect(writeText).toHaveBeenCalledExactlyOnceWith(window.location.href)
    expect(screen.getByRole('status')).toHaveTextContent('Link copied')
  })
})
