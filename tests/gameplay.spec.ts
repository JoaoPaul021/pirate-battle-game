import { expect, test } from '@playwright/test'
import {
  advanceGame,
  openGame,
  resetState,
  simulateFocusLoss,
  snapshotGame,
  setGameAction,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await resetState(page)
})

test('moves, rotates, respects the arena and blocks movement through an island', async ({ page }) => {
  await openGame(page, 'e2e=1&spawnMs=100000')
  const initial = await snapshotGame(page)

  await page.keyboard.down('KeyD')
  await advanceGame(page, 0.56)
  await page.keyboard.up('KeyD')

  const rotated = await snapshotGame(page)
  expect(rotated.player.rotation).toBeGreaterThan(initial.player.rotation + 1.4)

  await page.keyboard.down('KeyW')
  await advanceGame(page, 2)
  await page.keyboard.up('KeyW')

  const islandBlocked = await snapshotGame(page)
  expect(islandBlocked.player.x).toBeGreaterThan(initial.player.x)
  expect(islandBlocked.player.x).toBeLessThan(835)

  await page.keyboard.down('KeyA')
  await advanceGame(page, 0.56)
  await page.keyboard.up('KeyA')
  await page.keyboard.down('KeyW')
  await advanceGame(page, 6)
  await page.keyboard.up('KeyW')

  const bounded = await snapshotGame(page)
  expect(bounded.player.y).toBeGreaterThanOrEqual(57)
})

test('front cannon and broadside create projectiles and respect cooldowns', async ({ page }) => {
  await openGame(page, 'e2e=1&spawnMs=100000')

  await setGameAction(page, 'fireFront', true)
  await advanceGame(page, 0.02)
  await setGameAction(page, 'fireFront', false)

  const front = await snapshotGame(page)
  expect(front.projectiles.filter((projectile) => projectile.owner === 'player')).toHaveLength(1)

  await setGameAction(page, 'fireFront', true)
  await advanceGame(page, 0.2)
  await setGameAction(page, 'fireFront', false)

  const coolingDown = await snapshotGame(page)
  expect(coolingDown.projectiles.filter((projectile) => projectile.owner === 'player')).toHaveLength(1)

  await advanceGame(page, 0.25)
  await setGameAction(page, 'fireLeft', true)
  await advanceGame(page, 0.02)
  await setGameAction(page, 'fireLeft', false)

  const broadside = await snapshotGame(page)
  expect(
    broadside.projectiles.filter((projectile) => projectile.owner === 'player').length,
  ).toBeGreaterThanOrEqual(4)
})

test('spawns both required enemy behaviours in deterministic order', async ({ page }) => {
  await openGame(page, 'e2e=1&spawnMs=3000&playerHealth=10000')

  await advanceGame(page, 0.05)
  let state = await snapshotGame(page)
  expect(state.enemies.some((enemy) => enemy.type === 'chaser')).toBeTruthy()

  await advanceGame(page, 3.05)
  state = await snapshotGame(page)
  expect(state.enemies.some((enemy) => enemy.type === 'shooter')).toBeTruthy()
})

test('pauses manually and after focus loss without advancing the simulation', async ({ page }) => {
  await openGame(page, 'e2e=1&spawnMs=100000')
  await advanceGame(page, 1)

  await page.getByRole('button', { name: 'Pause match' }).click()
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible()
  const paused = await snapshotGame(page)
  await advanceGame(page, 2)
  const stillPaused = await snapshotGame(page)
  expect(Math.abs(stillPaused.elapsedMs - paused.elapsedMs)).toBeLessThan(20)

  const pauseDialog = page.getByRole('dialog', { name: 'Paused' })
  await pauseDialog.getByRole('button', { name: 'Resume', exact: true }).click()
  await expect(pauseDialog).toBeHidden()

  await advanceGame(page, 1)
  const resumed = await snapshotGame(page)
  expect(resumed.elapsedMs).toBeGreaterThan(paused.elapsedMs + 900)

  await simulateFocusLoss(page)
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible()
})

test('finishes by time, persists the result and restarts with clean state', async ({ page }) => {
  await openGame(page, 'e2e=1&durationMs=1000&spawnMs=100000')
  await advanceGame(page, 1.1)

  await expect.poll(async () => (await snapshotGame(page)).finished).toBeTruthy()
  const resultDialog = page.getByRole('dialog', { name: 'Battle Complete' })
  await expect(resultDialog).toBeVisible()
  await expect(resultDialog).toContainText('Time Up')
  await expect(resultDialog).toContainText('00:01')

  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem('pirate-battle-last-match')
    return raw ? JSON.parse(raw) as { score: number; reason: string } : null
  })
  expect(persisted).toMatchObject({ score: 0, reason: 'time' })

  await resultDialog.getByRole('button', { name: 'Play Again' }).click()
  await expect(page.getByRole('button', { name: 'Pause match' })).toBeEnabled()
  const restarted = await snapshotGame(page)
  expect(restarted.score).toBe(0)
  expect(restarted.finished).toBeFalsy()
  expect(restarted.player.health).toBe(100)

  await page.getByRole('button', { name: 'Main Menu' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  await expect(page.getByText('Last match')).toBeVisible()
})
