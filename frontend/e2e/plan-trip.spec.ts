import { accessibilityViolations } from './accessibility'
import { planChicagoToDenver, recommendationBanner } from './planTrip'
import { expect, test } from '@playwright/test'

test('plans an example trip and shows the recommendation, three routes and the map (REQ-11, REQ-06, NFR-03)', async ({
  page,
}) => {
  await planChicagoToDenver(page)

  await expect(recommendationBanner(page)).toContainText(/Route 1 [^.]*Route 2/)
  for (const routeNumber of [1, 2, 3]) {
    const card = page.getByRole('article', { name: `Route ${String(routeNumber)}` })
    await expect(card.getByText(/^\d+\.\d mi$/)).toBeVisible()
    await expect(card.getByText(/^\d+ h \d+ min$/)).toBeVisible()
    await expect(card.getByText(/^\w{3}, \w{3} \d+, \d\d:\d\d [A-Z]{2,4}$/)).toBeVisible()
  }
  await expect(page.locator('canvas').first()).toBeVisible()

  const summary = page.getByRole('heading', {
    level: 2,
    name: 'from Chicago, Illinois to Denver, Colorado',
  })
  await expect(summary.getByText('A', { exact: true })).toBeVisible()
  await expect(summary.getByText('B', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit trip' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Chicago to Denver' })).toBeHidden()

  expect(await accessibilityViolations(page)).toEqual([])
})
