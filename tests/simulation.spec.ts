import { expect, test } from '@playwright/test'
import { createGameConfig, DEFAULT_GAME_OPTIONS } from '../src/config/gameConfig'
import { GameSimulation } from '../src/game/simulation/GameSimulation'
import type { EnemyState, InputState } from '../src/game/types'

const idleInput = (): InputState => ({
  forward: false,
  turnLeft: false,
  turnRight: false,
  fireFront: false,
  fireLeft: false,
  fireRight: false,
})

const enemyAt = (
  simulation: GameSimulation,
  overrides: Partial<EnemyState> = {},
): EnemyState => ({
  id: 900,
  type: 'chaser',
  x: simulation.player.x,
  y: simulation.player.y - 50,
  rotation: 0,
  health: 55,
  maxHealth: 55,
  collisionRadius: 26,
  weaponCooldownMs: 0,
  hitFlashMs: 0,
  ...overrides,
})

test('a destroyed enemy scores once and the projectile is consumed', () => {
  const config = createGameConfig(DEFAULT_GAME_OPTIONS)
  config.enemies.spawnIntervalMs = 100_000
  const simulation = new GameSimulation(config, () => 0.5)

  simulation.enemies.push(enemyAt(simulation, {
    id: 901,
    y: simulation.player.y - 120,
    health: config.weapons.front.damage,
    maxHealth: config.weapons.front.damage,
  }))

  simulation.update(0.01, { ...idleInput(), fireFront: true })
  simulation.update(0.13, idleInput())

  expect(simulation.getScore()).toBe(1)
  expect(simulation.enemies).toHaveLength(0)
  expect(simulation.projectiles).toHaveLength(0)

  simulation.update(0.2, idleInput())
  expect(simulation.getScore()).toBe(1)
})

test('a chaser collision damages the player, self-destructs and does not score', () => {
  const config = createGameConfig(DEFAULT_GAME_OPTIONS)
  config.enemies.spawnIntervalMs = 100_000
  const simulation = new GameSimulation(config, () => 0.5)
  simulation.enemies.push(enemyAt(simulation))

  simulation.update(0.01, idleInput())

  expect(simulation.player.health).toBe(config.player.maxHealth - config.enemies.chaser.collisionDamage)
  expect(simulation.enemies).toHaveLength(0)
  expect(simulation.getScore()).toBe(0)
})

test('ends by death and stops accepting further simulation changes', () => {
  const config = createGameConfig(DEFAULT_GAME_OPTIONS)
  config.player.maxHealth = 20
  config.enemies.spawnIntervalMs = 100_000
  const simulation = new GameSimulation(config, () => 0.5)
  simulation.enemies.push(enemyAt(simulation))

  simulation.update(0.01, idleInput())
  const ended = simulation.getDebugState()
  simulation.update(5, { ...idleInput(), forward: true, fireFront: true })
  const after = simulation.getDebugState()

  expect(ended.finished).toBeTruthy()
  expect(ended.endReason).toBe('destroyed')
  expect(after.elapsedMs).toBe(ended.elapsedMs)
  expect(after.projectiles).toHaveLength(0)
})

test('ends by time and broadside cooldown prevents duplicate volleys', () => {
  const config = createGameConfig(DEFAULT_GAME_OPTIONS)
  config.sessionDurationMs = 2000
  config.enemies.spawnIntervalMs = 100_000
  const simulation = new GameSimulation(config, () => 0.5)

  simulation.update(0.01, { ...idleInput(), fireLeft: true })
  expect(simulation.projectiles).toHaveLength(3)

  simulation.update(0.5, { ...idleInput(), fireLeft: true })
  expect(simulation.projectiles.length).toBeLessThanOrEqual(3)

  simulation.update(1.49, idleInput())
  expect(simulation.isFinished()).toBeTruthy()
  expect(simulation.getMatchSummary()?.reason).toBe('time')
})
