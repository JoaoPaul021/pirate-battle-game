import { expect, test } from '@playwright/test'
import { resetState } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetState(page)
})

test('navigates menus and persists validated options', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Options' }).click()

  const sessionValue = page.locator('.stepper-value').nth(0)
  const spawnValue = page.locator('.stepper-value').nth(1)
  const increaseSession = page.getByRole('button', { name: 'Increase game session time' })
  const decreaseSpawn = page.getByRole('button', { name: 'Decrease enemy spawn time' })

  await expect(sessionValue).toHaveText('120 s')
  await expect(spawnValue).toHaveText('3 s')

  await increaseSession.click()
  await decreaseSpawn.click()
  await expect(sessionValue).toHaveText('150 s')
  await expect(spawnValue).toHaveText('2 s')

  await page.getByRole('button', { name: 'Save' }).click()

  await expect.poll(async () =>
    page.evaluate(() => {
      const raw = localStorage.getItem('pirate-battle-options')
      return raw ? JSON.parse(raw) : null
    }),
  ).toEqual({ sessionTime: 150, enemySpawnTime: 2 })

  await page.getByRole('button', { name: 'Main Menu' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Options' }).click()

  await expect(sessionValue).toHaveText('150 s')
  await expect(spawnValue).toHaveText('2 s')

  await increaseSession.click()
  await expect(sessionValue).toHaveText('180 s')
  await expect(increaseSession).toBeDisabled()

  await decreaseSpawn.click()
  await expect(spawnValue).toHaveText('1 s')
  await expect(decreaseSpawn).toBeDisabled()
})

test('supports repeated navigation without losing the menu', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Ranking' }).click()
  await expect(page.getByRole('heading', { name: 'Ranking' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()

  await page.getByRole('button', { name: 'Match History' }).click()
  await expect(page.getByRole('heading', { name: 'Match History' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()

  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

test('abandoning a match does not create a completed record', async ({ page }) => {
  await page.goto('/?e2e=1')
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Pause match' })).toBeEnabled()
  await page.getByRole('button', { name: 'Main Menu' }).click()

  const stored = await page.evaluate(() => ({
    confirmed: localStorage.getItem('pirate-battle-confirmed-matches'),
    pending: localStorage.getItem('pirate-battle-pending-matches'),
    last: localStorage.getItem('pirate-battle-last-match'),
  }))

  expect(stored.confirmed).toBeNull()
  expect(stored.pending).toBeNull()
  expect(stored.last).toBeNull()
})
