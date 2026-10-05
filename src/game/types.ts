export type InputAction =
  | 'forward'
  | 'turnLeft'
  | 'turnRight'
  | 'fireFront'
  | 'fireLeft'
  | 'fireRight'

export type InputState = Record<InputAction, boolean>

export type RectObstacle = {
  x: number
  y: number
  width: number
  height: number
}

export type PlayerState = {
  x: number
  y: number
  rotation: number
  health: number
  hitFlashMs: number
}

export type EnemyType = 'chaser' | 'shooter'

export type EnemyState = {
  id: number
  type: EnemyType
  x: number
  y: number
  rotation: number
  health: number
  maxHealth: number
  collisionRadius: number
  weaponCooldownMs: number
  hitFlashMs: number
}

export type ProjectileOwner = 'player' | 'enemy'

export type ProjectileState = {
  id: number
  owner: ProjectileOwner
  x: number
  y: number
  vx: number
  vy: number
  damage: number
  lifetimeMs: number
  collisionRadius: number
}

export type GameEvent =
  | {
      type: 'fire'
      x: number
      y: number
      rotation: number
      owner: ProjectileOwner
      weapon: 'front' | 'broadside' | 'enemy'
    }
  | {
      type: 'impact'
      x: number
      y: number
    }
  | {
      type: 'explosion'
      x: number
      y: number
    }
  | {
      type: 'score'
      x: number
      y: number
    }

export type MatchEndReason = 'time' | 'destroyed'

export type MatchSummary = {
  score: number
  elapsedSeconds: number
  reason: MatchEndReason
}

export type PauseReason = 'manual' | 'focus'

export type GameHudState = {
  health: number
  maxHealth: number
  score: number
  remainingSeconds: number
  enemyCount: number
}
