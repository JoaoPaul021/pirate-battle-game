import type { InputAction, InputState } from '../types'

const emptyInput = (): InputState => ({
  forward: false,
  turnLeft: false,
  turnRight: false,
  fireFront: false,
  fireLeft: false,
  fireRight: false,
})

const KEY_ACTIONS: Record<string, InputAction | undefined> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyA: 'turnLeft',
  ArrowLeft: 'turnLeft',
  KeyD: 'turnRight',
  ArrowRight: 'turnRight',
  Space: 'fireFront',
  KeyQ: 'fireLeft',
  KeyE: 'fireRight',
}

export class GameInput {
  private state = emptyInput()
  private attached = false

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const action = KEY_ACTIONS[event.code]

    if (!action) {
      return
    }

    event.preventDefault()
    this.state[action] = true
  }

  private readonly onKeyUp = (event: KeyboardEvent) => {
    const action = KEY_ACTIONS[event.code]

    if (!action) {
      return
    }

    event.preventDefault()
    this.state[action] = false
  }

  private readonly reset = () => {
    this.state = emptyInput()
  }

  attach() {
    if (this.attached) {
      return
    }

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.reset)
    this.attached = true
  }

  setAction(action: InputAction, active: boolean) {
    this.state[action] = active
  }

  getState() {
    return this.state
  }

  clear() {
    this.reset()
  }

  destroy() {
    if (!this.attached) {
      return
    }

    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.reset)
    this.attached = false
    this.reset()
  }
}
