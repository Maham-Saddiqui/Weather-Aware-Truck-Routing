import { planChicagoToDenver, recommendationBanner } from './planTrip'
import { expect, test } from './test'

test('a shared link plans the same trip automatically in a new page (REQ-14, REQ-16)', async ({
  page,
  context,
}) => {
  await planChicagoToDenver(page)

  await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible()
  const query = new URL(page.url()).searchParams
  expect([...query.keys()]).toEqual(
    expect.arrayContaining(['o', 'olat', 'olon', 'd', 'dlat', 'dlon', 'dep', 'load', 'spacing']),
  )
  expect(query.get('load')).toBe('42000')
  expect(query.get('spacing')).toBe('25')
  const recommendation = await recommendationBanner(page).textContent()

  const friend = await context.newPage()
  await friend.goto(page.url())

  await expect(recommendationBanner(friend)).toHaveText(recommendation ?? '')
  await expect(friend.getByRole('article')).toHaveCount(3)
  await expect(
    friend.getByRole('heading', { level: 2, name: 'from Chicago, Illinois to Denver, Colorado' }),
  ).toBeVisible()
})
