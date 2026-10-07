import { expect, test } from '@playwright/test'
import { advanceGame, chooseNetworkScenario, gotoApp, openGame, reloadApp, resetState } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetState(page)
})

test('paginates ranking and match history', async ({ page }) => {
  await gotoApp(page)
  await page.getByRole('button', { name: 'Ranking' }).click()
  await expect(page.getByText('Maria Silva')).toBeVisible()
  await expect(page.getByText(/Page 1 of/)).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText(/Page 2 of/)).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'Match History' }).click()
  await expect(page.getByText(/Page 1 of 2/)).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText(/Page 2 of 2/)).toBeVisible()
})

test('shows empty and error states without blocking navigation', async ({ page }) => {
  await gotoApp(page)
  await page.getByRole('button', { name: 'Ranking' }).click()
  await expect(page.getByText('Maria Silva')).toBeVisible()

  const emptyResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/ranking') &&
      response.request().method() === 'GET' &&
      response.status() === 200,
  )

  await chooseNetworkScenario(page, 'Empty lists')
  await emptyResponse

  await expect(
    page.getByText('No completed matches for this configuration yet.'),
  ).toBeVisible({ timeout: 10_000 })

  const errorResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/ranking') &&
      response.request().method() === 'GET' &&
      response.status() === 503,
  )

  await chooseNetworkScenario(page, 'Ranking failure')
  await errorResponse

  await expect(page.getByRole('alert')).toContainText(
    'Ranking unavailable',
    { timeout: 10_000 },
  )

  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

test('keeps a failed registration pending across refresh and retries it later', async ({ page }) => {
  await openGame(page, 'e2e=1&durationMs=1000&spawnMs=100000')
  await page.evaluate(() => {
    localStorage.setItem('pirate-battle-network-scenario', 'offline-registration')
  })
  await advanceGame(page, 1.1)
  await expect(page.getByText('Registration pending')).toBeVisible()

  await page.getByRole('dialog').getByRole('button', { name: 'Main Menu', exact: true }).click()
  await reloadApp(page)
  await expect(page.getByText('1 match waiting to sync.')).toBeVisible({ timeout: 10_000 })

  await page.evaluate(() => {
    localStorage.setItem('pirate-battle-network-scenario', 'success')
  })
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByText('1 match waiting to sync.')).toBeHidden({ timeout: 10_000 })

  const pending = await page.evaluate(() => localStorage.getItem('pirate-battle-pending-matches'))
  expect(pending === null || pending === '[]').toBeTruthy()
})

test('recovers a timed-out post without duplicating the confirmed match', async ({ page }) => {
  await openGame(page, 'e2e=1&durationMs=1000&spawnMs=100000')
  await page.evaluate(() => {
    localStorage.setItem('pirate-battle-network-scenario', 'post-timeout')
  })

  await advanceGame(page, 1.1)
  await expect(page.getByText('Registration pending')).toBeVisible({ timeout: 10_000 })

  await expect.poll(async () =>
    page.evaluate(() => {
      const raw = localStorage.getItem('pirate-battle-pending-matches')
      return raw ? JSON.parse(raw).length : 0
    }),
    { timeout: 10_000 },
  ).toBe(1)

  await page.evaluate(() => {
    localStorage.setItem('pirate-battle-network-scenario', 'success')
  })
  await page.getByRole('button', { name: 'Retry registration' }).click()

  await expect.poll(async () =>
    page.evaluate(() => {
      const raw = localStorage.getItem('pirate-battle-pending-matches')
      return raw ? JSON.parse(raw).length : 0
    }),
    { timeout: 10_000 },
  ).toBe(0)

  const confirmed = await page.evaluate(() => {
    const raw = localStorage.getItem('pirate-battle-confirmed-matches')
    return raw ? JSON.parse(raw) as Array<{ id: string }> : []
  })

  expect(confirmed).toHaveLength(1)
  expect(new Set(confirmed.map((record) => record.id)).size).toBe(1)
})
