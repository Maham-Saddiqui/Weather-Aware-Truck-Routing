import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './shared/testing/server'

// A dialog's code loads on first use; the shared build machine needs more than the default second.
configure({ asyncUtilTimeout: 5000 })

// jsdom does not implement scrolling; tests that care spy on this.
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  configurable: true,
  writable: true,
  value: () => undefined,
})

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
