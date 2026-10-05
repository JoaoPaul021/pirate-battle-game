export type GameOptions = {
  sessionTime: number
  enemySpawnTime: number
}

export const GAME_OPTIONS_STORAGE_KEY = 'pirate-battle-options'

export const GAME_OPTIONS_LIMITS = {
  sessionTime: {
    min: 60,
    max: 180,
    step: 30,
  },
  enemySpawnTime: {
    min: 1,
    max: 10,
    step: 1,
  },
} as const

export const DEFAULT_GAME_OPTIONS: GameOptions = {
  sessionTime: 120,
  enemySpawnTime: 3,
}

const isValidOption = (value: number, min: number, max: number) =>
  Number.isFinite(value) && value >= min && value <= max

export const loadGameOptions = (): GameOptions => {
  const stored = localStorage.getItem(GAME_OPTIONS_STORAGE_KEY)

  if (!stored) {
    return DEFAULT_GAME_OPTIONS
  }

  try {
    const parsed = JSON.parse(stored) as Partial<GameOptions>
    const sessionTime = Number(parsed.sessionTime)
    const enemySpawnTime = Number(parsed.enemySpawnTime)

    if (
      !isValidOption(
        sessionTime,
        GAME_OPTIONS_LIMITS.sessionTime.min,
        GAME_OPTIONS_LIMITS.sessionTime.max,
      ) ||
      !isValidOption(
        enemySpawnTime,
        GAME_OPTIONS_LIMITS.enemySpawnTime.min,
        GAME_OPTIONS_LIMITS.enemySpawnTime.max,
      )
    ) {
      return DEFAULT_GAME_OPTIONS
    }

    return {
      sessionTime,
      enemySpawnTime,
    }
  } catch {
    return DEFAULT_GAME_OPTIONS
  }
}

export const saveGameOptions = (options: GameOptions) => {
  localStorage.setItem(GAME_OPTIONS_STORAGE_KEY, JSON.stringify(options))
}
