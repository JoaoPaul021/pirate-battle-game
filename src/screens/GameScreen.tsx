import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameConfig } from '../config/gameConfig'
import TouchControl from '../components/TouchControl'
import { PirateGame } from '../game/PirateGame'
import type { GameHudState, InputAction } from '../game/types'

type GameScreenProps = {
  config: GameConfig
  onExit: () => void
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function GameScreen({ config, onExit }: GameScreenProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<PirateGame | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'ended'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [hud, setHud] = useState<GameHudState>({
    health: config.player.maxHealth,
    maxHealth: config.player.maxHealth,
    score: 0,
    remainingSeconds: Math.ceil(config.sessionDurationMs / 1000),
  })

  const healthPercent = useMemo(
    () => Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100)),
    [hud.health, hud.maxHealth],
  )

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    const game = new PirateGame(host, config, {
      onReady: () => setStatus('ready'),
      onHudChange: setHud,
      onError: (message) => {
        setErrorMessage(message)
        setStatus('error')
      },
      onTimeExpired: () => setStatus('ended'),
    })

    gameRef.current = game
    void game.init()

    return () => {
      gameRef.current = null
      game.destroy()
    }
  }, [config])

  const setAction = (action: InputAction, active: boolean) => {
    gameRef.current?.setAction(action, active)
  }

  const bindAction = (action: InputAction) => ({
    onPress: () => setAction(action, true),
    onRelease: () => setAction(action, false),
  })

  const handleExit = () => {
    gameRef.current?.clearInput()
    onExit()
  }

  return (
    <section className="game-screen" aria-label="Pirate Battle match">
      <div ref={hostRef} className="game-canvas-host" data-testid="game-canvas" />

      <div className="game-hud game-hud--left" aria-label="Player health">
        <img src="/png/default/ui/hud/icon_heart.png" alt="" />
        <div className="hud-health">
          <span style={{ width: `${healthPercent}%` }} />
          <strong>{hud.health} / {hud.maxHealth}</strong>
        </div>
      </div>

      <div className="game-hud game-hud--center">
        <div className="hud-counter">
          <img src="/png/default/ui/hud/icon_score.png" alt="" />
          <strong>{hud.score}</strong>
        </div>
        <div className="hud-counter">
          <img src="/png/default/ui/hud/icon_time.png" alt="" />
          <strong>{formatTime(hud.remainingSeconds)}</strong>
        </div>
      </div>

      <button className="game-exit-button" type="button" onClick={handleExit}>
        <img src="/png/default/ui/controls/icon_home.png" alt="" />
        <span>Main Menu</span>
      </button>

      <div className="desktop-control-hint" aria-hidden="true">
        <span><kbd>W</kbd> sail</span>
        <span><kbd>A</kbd><kbd>D</kbd> turn</span>
      </div>

      <div className="touch-controls touch-controls--movement" aria-label="Touch movement controls">
        <TouchControl
          label="Turn left"
          icon="/png/default/ui/controls/icon_turn_left.png"
          {...bindAction('turnLeft')}
        />
        <TouchControl
          label="Sail forward"
          icon="/png/default/ui/controls/icon_forward.png"
          {...bindAction('forward')}
        />
        <TouchControl
          label="Turn right"
          icon="/png/default/ui/controls/icon_turn_right.png"
          {...bindAction('turnRight')}
        />
      </div>

      {status === 'loading' && (
        <div className="game-message" role="status">
          <strong>Preparing the waters...</strong>
          <span>Loading textures and starting the simulation.</span>
        </div>
      )}

      {status === 'error' && (
        <div className="game-message game-message--error" role="alert">
          <strong>Unable to start the battle</strong>
          <span>{errorMessage}</span>
          <button type="button" onClick={handleExit}>Main Menu</button>
        </div>
      )}

      {status === 'ended' && (
        <div className="game-message" role="status">
          <strong>Time's up</strong>
          <span>Battle complete. Return to the main menu.</span>
          <button type="button" onClick={handleExit}>Main Menu</button>
        </div>
      )}
    </section>
  )
}

export default GameScreen
