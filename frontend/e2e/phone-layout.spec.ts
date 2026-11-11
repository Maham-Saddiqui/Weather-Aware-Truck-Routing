import { expect, test } from '@playwright/test'
import { planChicagoToDenver } from './planTrip'

test.use({ viewport: { width: 390, height: 844 } })

test('the results page does not scroll sideways on a phone (NFR-04)', async ({ page }) => {
  await planChicagoToDenver(page)

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))

  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
})
