import type { Page } from '@playwright/test'
import { planChicagoToDenver } from './planTrip'
import { expect, test } from './test'

async function pressShiftTabFromToggle(page: Page, toggleName: string) {
  await page.getByRole('button', { name: toggleName }).focus()
  await page.keyboard.press('Shift+Tab')
}

test('hides and shows the results panel and remembers the choice (REQ-11, NFR-03)', async ({
  page,
}) => {
  await planChicagoToDenver(page)
  const results = page.getByRole('region', { name: 'Route results' })
  const hide = page.getByRole('button', { name: 'Hide results panel' })
  await expect(hide).toHaveAttribute('aria-expanded', 'true')
  await pressShiftTabFromToggle(page, 'Hide results panel')
  await expect(results.locator(':focus')).toHaveCount(1)

  await hide.click()

  const show = page.getByRole('button', { name: 'Show results panel' })
  await expect(show).toHaveAttribute('aria-expanded', 'false')
  await pressShiftTabFromToggle(page, 'Show results panel')
  await expect(results.locator(':focus')).toHaveCount(0)

  await page.goto('/')
  await expect(show).toHaveAttribute('aria-expanded', 'false')
  await pressShiftTabFromToggle(page, 'Show results panel')
  await expect(page.getByRole('region', { name: 'Trip details' }).locator(':focus')).toHaveCount(0)

  await show.click()

  await expect(hide).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Chicago to Denver' })).toBeVisible()
})
