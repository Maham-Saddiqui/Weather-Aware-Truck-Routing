import { collectPageErrors, planChicagoToDenver } from './planTrip'
import { expect, test } from './test'

test('moves the forecast clock by keyboard and plays and pauses it (REQ-08, NFR-03)', async ({
  page,
}) => {
  const pageErrors = collectPageErrors(page)
  await planChicagoToDenver(page)
  const slider = page.getByRole('slider', { name: 'Hours after departure' })
  const clock = page.getByText(/, \+\d+ h$/)
  const status = page.getByText(/^Along the routes at .+: .+/)

  await slider.focus()
  await expect(clock).toHaveText(/, \+0 h$/)
  const statusAtDeparture = await status.textContent()

  await page.keyboard.press('ArrowRight')
  await expect(clock).toHaveText(/, \+1 h$/)
  await expect(slider).toHaveAttribute('aria-valuetext', /, \+1 h$/)
  await expect(status).not.toHaveText(statusAtDeparture ?? '')

  await page.keyboard.press('End')
  await expect(clock).toHaveText(/, \+48 h$/)
  await page.keyboard.press('Home')
  await expect(clock).toHaveText(/, \+0 h$/)

  await page.getByRole('button', { name: 'Play the trip' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(clock).not.toHaveText(/, \+0 h$/)
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Play the trip' })).toBeVisible()

  expect(pageErrors).toEqual([])
})
