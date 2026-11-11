import { planChicagoToDenver } from './planTrip'
import { expect, test } from './test'

test('selects another route and a checkpoint and shows its weather (REQ-06, REQ-07, REQ-08)', async ({
  page,
}) => {
  await planChicagoToDenver(page)
  const route1 = page.getByRole('button', { name: 'Route 1', exact: true })
  const route2 = page.getByRole('button', { name: 'Route 2', exact: true })
  await expect(route1).toHaveAttribute('aria-pressed', 'true')
  await expect(route2).toHaveAttribute('aria-pressed', 'false')

  await route2.click()

  await expect(route2).toHaveAttribute('aria-pressed', 'true')
  await expect(route1).toHaveAttribute('aria-pressed', 'false')
  const checkpoints = page.getByRole('region', { name: /^Checkpoints on Route 2/ })
  await expect(checkpoints).toBeVisible()

  const row = checkpoints.getByRole('button', { name: /^Mile 25\.0 / })
  await expect(row).not.toHaveAttribute('aria-current', 'true')
  await row.click()

  await expect(row).toHaveAttribute('aria-current', 'true')
  const details = checkpoints.getByRole('heading', { level: 4, name: /^Mile 25\.0/ })
  await expect(details).toBeVisible()
  for (const label of ['Wind', 'Rain', 'Snow', 'Estimated arrival']) {
    await expect(checkpoints.getByText(label, { exact: true })).toBeVisible()
  }
  await expect(checkpoints.getByText(/ mph$/).first()).toBeVisible()
})
