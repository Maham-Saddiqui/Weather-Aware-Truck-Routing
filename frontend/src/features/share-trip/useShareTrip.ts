import { useEffect, useState } from 'react'

export type ShareStatus = 'idle' | 'copied' | 'failed'

const COPIED_MESSAGE_MS = 4000
const SHARE_TITLE = 'Weather-aware truck route'

function wasCancelledByDriver(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function copyLink(url: string): Promise<ShareStatus> {
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

async function shareOrCopy(url: string, canShare: boolean): Promise<ShareStatus> {
  if (canShare) {
    try {
      await navigator.share({ title: SHARE_TITLE, url })
      return 'idle'
    } catch (error) {
      if (wasCancelledByDriver(error)) return 'idle'
    }
  }
  return copyLink(url)
}

export function useShareTrip() {
  const [status, setStatus] = useState<ShareStatus>('idle')
  const canShare = 'share' in navigator

  useEffect(() => {
    if (status !== 'copied') return
    const timer = setTimeout(() => {
      setStatus('idle')
    }, COPIED_MESSAGE_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [status])

  const share = async () => {
    setStatus(await shareOrCopy(window.location.href, canShare))
  }

  return { status, canShare, share }
}
