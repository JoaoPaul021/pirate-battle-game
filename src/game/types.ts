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
}

export type GameHudState = {
  health: number
  maxHealth: number
  score: number
  remainingSeconds: number
}
