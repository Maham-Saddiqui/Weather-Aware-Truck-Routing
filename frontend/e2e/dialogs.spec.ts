import type { Page } from '@playwright/test'
import { accessibilityViolations } from './accessibility'
import { expect, test } from '@playwright/test'

async function expectFocusStaysInside(page: Page, dialogName: string) {
  const dialog = page.getByRole('dialog', { name: dialogName })
  for (let tabs = 0; tabs < 6; tabs += 1) {
    await page.keyboard.press('Tab')
    await expect(dialog.locator(':focus')).toHaveCount(1)
  }
}

async function expectEscapeReturnsFocus(page: Page, dialogName: string, openerName: string) {
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: dialogName })).toBeHidden()
  await expect(page.getByRole('button', { name: openerName })).toBeFocused()
}

test.describe('dialogs (REQ-13, REQ-15, NFR-03)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Credits names the data sources and keeps keyboard focus inside', async ({ page }) => {
    await page.getByRole('button', { name: 'Credits' }).click()
    const dialog = page.getByRole('dialog', { name: 'Credits' })

    await expect(dialog.getByText('Synthetic routing credit')).toBeVisible()
    await expect(dialog.getByText('© OpenStreetMap contributors, © OpenMapTiles')).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Weather data by Open-Meteo.com' })).toBeVisible()
    expect(await accessibilityViolations(page)).toEqual([])

    await expectFocusStaysInside(page, 'Credits')
    await expectEscapeReturnsFocus(page, 'Credits', 'Credits')
  })

  test('How risk works explains the levels and that arrival times are driving time only', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'How risk works' }).click()
    const dialog = page.getByRole('dialog', { name: 'How risk is calculated' })

    await expect(
      dialog.getByRole('table', { name: 'Risk levels by weather reading' }),
    ).toBeVisible()
    await expect(dialog.getByText(/^Arrival times are driving time only\./)).toBeVisible()
    expect(await accessibilityViolations(page)).toEqual([])

    await expectFocusStaysInside(page, 'How risk is calculated')
    await expectEscapeReturnsFocus(page, 'How risk is calculated', 'How risk works')
  })
})
