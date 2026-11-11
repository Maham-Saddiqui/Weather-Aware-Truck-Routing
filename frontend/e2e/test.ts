import { test as base, type Route } from '@playwright/test'

interface RecordedAnswer {
  status: number
  headers: Record<string, string>
  body: Buffer
}

// The rehearsal server throttles per minute (10 trip requests, 6 credit requests), far fewer than a suite makes.
// Each distinct request therefore reaches the server once per run; later identical ones get the same synthetic answer.
const answers = new Map<string, RecordedAnswer>()

async function answerOnceFromServer(route: Route) {
  const request = route.request()
  const key = `${request.method()} ${request.url()} ${request.postData() ?? ''}`
  const known = answers.get(key)
  if (known) {
    await route.fulfill(known)
    return
  }
  const response = await route.fetch()
  if (response.ok()) {
    answers.set(key, {
      status: response.status(),
      headers: response.headers(),
      body: await response.body(),
    })
  }
  await route.fulfill({ response })
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route('**/api/v1/**', answerOnceFromServer)
    await use(context)
  },
})

export { expect } from '@playwright/test'
