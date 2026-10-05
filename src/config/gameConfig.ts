export type GameOptions = {
  sessionTime: number
  enemySpawnTime: number
}

export type WeaponConfig = {
  cooldownMs: number
  damage: number
  projectileSpeed: number
  projectileLifetimeMs: number
}

export type GameConfig = {
  sessionDurationMs: number
  arena: {
    width: number
    height: number
    padding: number
  }
  player: {
    maxHealth: number
    moveSpeed: number
    rotationSpeed: number
    collisionRadius: number
  }
  enemies: {
    spawnIntervalMs: number
    minSpawnDistance: number
    chaserWeight: number
    shooterWeight: number
    chaser: {
      maxHealth: number
      moveSpeed: number
      rotationSpeed: number
      collisionDamage: number
    }
    shooter: {
      maxHealth: number
      moveSpeed: number
      rotationSpeed: number
      attackRange: number
      weapon: WeaponConfig
    }
  }
  weapons: {
    front: WeaponConfig
    broadside: WeaponConfig
  }
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

export const createGameConfig = (options: GameOptions): GameConfig => ({
  sessionDurationMs: options.sessionTime * 1000,
  arena: {
    width: 1280,
    height: 720,
    padding: 30,
  },
  player: {
    maxHealth: 100,
    moveSpeed: 220,
    rotationSpeed: 2.8,
    collisionRadius: 27,
  },
  enemies: {
    spawnIntervalMs: options.enemySpawnTime * 1000,
    minSpawnDistance: 260,
    chaserWeight: 0.55,
    shooterWeight: 0.45,
    chaser: {
      maxHealth: 55,
      moveSpeed: 135,
      rotationSpeed: 2.2,
      collisionDamage: 28,
    },
    shooter: {
      maxHealth: 70,
      moveSpeed: 105,
      rotationSpeed: 1.9,
      attackRange: 360,
      weapon: {
        cooldownMs: 1400,
        damage: 12,
        projectileSpeed: 360,
        projectileLifetimeMs: 1800,
      },
    },
  },
  weapons: {
    front: {
      cooldownMs: 420,
      damage: 24,
      projectileSpeed: 620,
      projectileLifetimeMs: 1250,
    },
    broadside: {
      cooldownMs: 1100,
      damage: 18,
      projectileSpeed: 500,
      projectileLifetimeMs: 1100,
    },
  },
})
