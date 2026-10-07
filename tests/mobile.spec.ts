import { expect, test } from '@playwright/test'
import {
  advanceGame,
  gotoApp,
  openGame,
  reloadApp,
  resetState,
  snapshotGame,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await resetState(page)
})

test('navigates the main mobile screens', async ({ page }) => {
  await gotoApp(page)
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  await page.getByRole('button', { name: 'Options' }).click()
  await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible()
  await page.getByRole('button', { name: 'Main Menu' }).click()

  await page.getByRole('button', { name: 'Ranking' }).click()
  await expect(page.getByRole('heading', { name: 'Ranking' })).toBeVisible()
  await expect(page.getByText('Maria Silva')).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()

  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

test('shows a mobile ranking error without blocking navigation', async ({ page }) => {
  await gotoApp(page)
  await page.evaluate(() => {
    localStorage.setItem('pirate-battle-network-scenario', 'ranking-error')
  })
  await reloadApp(page)

  await page.getByRole('button', { name: 'Ranking' }).click()
  await expect(page.getByRole('alert')).toContainText('Ranking unavailable', {
    timeout: 10_000,
  })
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

test('uses touch controls for movement and combat', async ({ page }) => {
  await openGame(page, 'e2e=1&spawnMs=100000')

  const before = await snapshotGame(page)
  const forward = page.getByRole('button', { name: 'Sail forward' })
  await expect(forward).toBeVisible()

  await forward.dispatchEvent('pointerdown', {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
  })
  await advanceGame(page, 0.5)
  await forward.dispatchEvent('pointerup', {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
  })

  const moved = await snapshotGame(page)
  expect(moved.player.y).toBeLessThan(before.player.y)

  const fireFront = page.getByRole('button', { name: 'Fire front cannon' })
  await fireFront.dispatchEvent('pointerdown', {
    pointerId: 2,
    pointerType: 'touch',
    isPrimary: true,
  })
  await advanceGame(page, 0.02)
  await fireFront.dispatchEvent('pointerup', {
    pointerId: 2,
    pointerType: 'touch',
    isPrimary: true,
  })

  const fired = await snapshotGame(page)
  expect(
    fired.projectiles.some((projectile) => projectile.owner === 'player'),
  ).toBeTruthy()
})

test('finishes a short match and exposes the result actions on mobile', async ({ page }) => {
  await openGame(page, 'e2e=1&durationMs=1000&spawnMs=100000')
  await advanceGame(page, 1.25)

  await expect.poll(async () => {
    const state = await snapshotGame(page)
    return { finished: state.finished, reason: state.endReason }
  }).toEqual({ finished: true, reason: 'time' })

  const result = page.locator('.game-dialog--result')
  await expect(result).toBeVisible({ timeout: 10_000 })
  await expect(result).toContainText('Battle Complete')
  await expect(result).toContainText('Time Up')
  await expect(result.getByText('Play Again', { exact: true })).toBeVisible()
  await expect(result.getByText('Main Menu', { exact: true })).toBeVisible()
})
