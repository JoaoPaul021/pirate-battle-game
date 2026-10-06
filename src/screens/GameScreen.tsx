import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameConfig } from '../config/gameConfig'
import { PLAYER_ID, PLAYER_NAME, type MatchRecord } from '../api/contracts'
import { useRegisterMatch } from '../api/queries'
import { saveLastMatch } from '../api/storage'
import GameButton from '../components/GameButton'
import TouchControl from '../components/TouchControl'
import { PirateGame } from '../game/PirateGame'
import type {
  GameHudState,
  InputAction,
  MatchSummary,
  PauseReason,
} from '../game/types'

type GameScreenProps = {
  config: GameConfig
  onExit: () => void
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

const createInitialHud = (config: GameConfig): GameHudState => ({
  health: config.player.maxHealth,
  maxHealth: config.player.maxHealth,
  score: 0,
  remainingSeconds: Math.ceil(config.sessionDurationMs / 1000),
  enemyCount: 0,
})

function GameScreen({ config, onExit }: GameScreenProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<PirateGame | null>(null)
  const resumeButtonRef = useRef<HTMLButtonElement>(null)
  const resultButtonRef = useRef<HTMLButtonElement>(null)
  const [runId, setRunId] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'ended'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [hud, setHud] = useState<GameHudState>(() => createInitialHud(config))
  const [paused, setPaused] = useState(false)
  const [pauseReason, setPauseReason] = useState<PauseReason | null>(null)
  const [summary, setSummary] = useState<MatchSummary | null>(null)
  const [record, setRecord] = useState<MatchRecord | null>(null)
  const registerMatch = useRegisterMatch()
  const registerRef = useRef(registerMatch.mutate)
  const matchIdRef = useRef(crypto.randomUUID())

  useEffect(() => {
    registerRef.current = registerMatch.mutate
  }, [registerMatch.mutate])

  useEffect(() => {
    if (paused) {
      resumeButtonRef.current?.focus()
    }
  }, [paused])

  useEffect(() => {
    if (status === 'ended') {
      resultButtonRef.current?.focus()
    }
  }, [status])

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
      onPauseChange: (isPaused, reason) => {
        setPaused(isPaused)
        setPauseReason(reason)
      },
      onMatchEnd: (matchSummary) => {
        const completedMatch: MatchRecord = {
          id: matchIdRef.current,
          playerId: PLAYER_ID,
          playerName: PLAYER_NAME,
          completedAt: new Date().toISOString(),
          score: matchSummary.score,
          durationSeconds: matchSummary.elapsedSeconds,
          reason: matchSummary.reason,
          config,
        }

        saveLastMatch(completedMatch)
        setRecord(completedMatch)
        registerRef.current(completedMatch)
        setSummary(matchSummary)
        setPaused(false)
        setPauseReason(null)
        setStatus('ended')
      },
    })

    gameRef.current = game
    void game.init()

    return () => {
      gameRef.current = null
      game.destroy()
    }
  }, [config, runId])

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

  const handleRestart = () => {
    setStatus('loading')
    setErrorMessage('')
    setSummary(null)
    setRecord(null)
    registerMatch.reset()
    matchIdRef.current = crypto.randomUUID()
    setPaused(false)
    setPauseReason(null)
    setHud(createInitialHud(config))
    setRunId((current) => current + 1)
  }

  const handlePause = () => {
    gameRef.current?.togglePause()
  }

  const handleResume = () => {
    gameRef.current?.resume()
  }

  const resultTitle = summary?.reason === 'destroyed' ? 'Ship Lost' : 'Battle Complete'
  const resultReason = summary?.reason === 'destroyed' ? 'Destroyed' : 'Time Up'
  const registrationLabel = registerMatch.isPending
    ? 'Saving match...'
    : registerMatch.isSuccess
      ? 'Match registered'
      : registerMatch.isError
        ? 'Registration pending'
        : 'Waiting to register'

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

      <div className="game-top-actions">
        <button
          className="game-icon-button"
          type="button"
          onClick={handlePause}
          aria-label={paused ? 'Resume match' : 'Pause match'}
          disabled={status !== 'ready' && !paused}
        >
          <img
            src={paused ? '/png/default/ui/controls/icon_play.png' : '/png/default/ui/controls/icon_pause.png'}
            alt=""
          />
        </button>
        <button className="game-exit-button" type="button" onClick={handleExit}>
          <img src="/png/default/ui/controls/icon_home.png" alt="" />
          <span>Main Menu</span>
        </button>
      </div>

      <div className="desktop-control-hint" aria-hidden="true">
        <span><kbd>W</kbd> sail</span>
        <span><kbd>A</kbd><kbd>D</kbd> turn</span>
        <span><kbd>Space</kbd> front</span>
        <span><kbd>Q</kbd><kbd>E</kbd> broadside</span>
        <span><kbd>Esc</kbd> pause</span>
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

      <div className="touch-controls touch-controls--attacks" aria-label="Touch attack controls">
        <TouchControl
          label="Fire left broadside"
          icon="/png/default/ui/controls/icon_fire_left.png"
          {...bindAction('fireLeft')}
        />
        <TouchControl
          label="Fire front cannon"
          icon="/png/default/ui/controls/icon_fire_front.png"
          {...bindAction('fireFront')}
        />
        <TouchControl
          label="Fire right broadside"
          icon="/png/default/ui/controls/icon_fire_right.png"
          {...bindAction('fireRight')}
        />
      </div>

      <p className="sr-only" aria-live="polite">
        Health {hud.health} of {hud.maxHealth}. Score {hud.score}. Time remaining {hud.remainingSeconds} seconds. Enemies {hud.enemyCount}.
      </p>

      {status === 'loading' && (
        <div className="game-dialog-backdrop">
          <div className="game-dialog game-dialog--compact" role="status">
            <strong>Preparing the waters...</strong>
            <span>Loading textures and starting the simulation.</span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="game-dialog-backdrop">
          <div className="game-dialog game-dialog--compact game-dialog--error" role="alert">
            <strong>Unable to start the battle</strong>
            <span>{errorMessage}</span>
            <div className="game-dialog-actions">
              <GameButton compact onClick={handleRestart}>Try Again</GameButton>
              <GameButton variant="secondary" compact onClick={handleExit}>Main Menu</GameButton>
            </div>
          </div>
        </div>
      )}

      {paused && status === 'ready' && (
        <div className="game-dialog-backdrop">
          <div
            className="game-dialog game-dialog--pause"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-title"
          >
            <span className="game-dialog-eyebrow">Battle status</span>
            <strong id="pause-title" className="game-dialog-title">Paused</strong>
            <p>
              {pauseReason === 'focus'
                ? 'The battle paused when the game lost focus.'
                : 'Timer, enemies, projectiles and cooldowns are suspended.'}
            </p>
            <div className="game-dialog-actions">
              <GameButton ref={resumeButtonRef} onClick={handleResume}>Resume</GameButton>
              <GameButton variant="secondary" onClick={handleExit}>Main Menu</GameButton>
            </div>
          </div>
        </div>
      )}

      {status === 'ended' && summary && (
        <div className="game-dialog-backdrop">
          <div
            className="game-dialog game-dialog--result"
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-title"
          >
            <span className="game-dialog-eyebrow">Match result</span>
            <strong id="result-title" className="game-dialog-title">{resultTitle}</strong>
            <strong className="result-score">{summary.score}</strong>
            <span className="result-meta">
              Points · {formatTime(summary.elapsedSeconds)} · {resultReason}
            </span>
            <span
              className={registerMatch.isError
                ? 'registration-status registration-status--error'
                : 'registration-status'}
              aria-live="polite"
            >
              {registrationLabel}
            </span>
            {registerMatch.isError && record && (
              <button
                className="registration-retry"
                type="button"
                onClick={() => registerMatch.mutate(record)}
              >
                Retry registration
              </button>
            )}
            <div className="game-dialog-actions">
              <GameButton ref={resultButtonRef} onClick={handleRestart}>Play Again</GameButton>
              <GameButton variant="secondary" onClick={handleExit}>Main Menu</GameButton>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default GameScreen
