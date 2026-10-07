import type { GameConfig } from '../../config/gameConfig'

const getParams = () => new URLSearchParams(window.location.search)

export const isE2EMode = () => getParams().get('e2e') === '1'

export const shouldFailAssetLoading = () =>
  isE2EMode() && getParams().get('failAsset') === '1'

const numberParam = (key: string) => {
  const value = Number(getParams().get(key))
  return Number.isFinite(value) && value > 0 ? value : null
}

export const applyE2EConfig = (config: GameConfig): GameConfig => {
  if (!isE2EMode()) {
    return config
  }

  const durationMs = numberParam('durationMs')
  const spawnMs = numberParam('spawnMs')
  const playerHealth = numberParam('playerHealth')

  return {
    ...config,
    sessionDurationMs: durationMs ?? config.sessionDurationMs,
    player: {
      ...config.player,
      maxHealth: playerHealth ?? config.player.maxHealth,
    },
    enemies: {
      ...config.enemies,
      spawnIntervalMs: spawnMs ?? config.enemies.spawnIntervalMs,
    },
  }
}

export const createSeededRandom = (seed = 1337) => {
  let state = seed >>> 0

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}
