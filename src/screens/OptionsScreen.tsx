import { useState } from 'react'
import GameButton from '../components/GameButton'
import MenuPanel from '../components/MenuPanel'
import RoundStepper from '../components/RoundStepper'
import {
  GAME_OPTIONS_LIMITS,
  saveGameOptions,
  type GameOptions,
} from '../config/gameConfig'

type OptionsScreenProps = {
  options: GameOptions
  onSave: (options: GameOptions) => void
  onBack: () => void
}

function OptionsScreen({ options, onSave, onBack }: OptionsScreenProps) {
  const [draft, setDraft] = useState(options)
  const [saved, setSaved] = useState(false)

  const updateOption = (key: keyof GameOptions, value: number) => {
    setSaved(false)
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const handleSave = () => {
    saveGameOptions(draft)
    onSave(draft)
    setSaved(true)
  }

  const handleBack = () => {
    if (draft.sessionTime !== options.sessionTime || draft.enemySpawnTime !== options.enemySpawnTime) {
      handleSave()
    }
    onBack()
  }

  return (
    <MenuPanel className="options-panel" labelledBy="options-title">
      <div className="screen-heading">
        <span>Game settings</span>
        <h1 id="options-title">Options</h1>
      </div>

      <div className="options-list">
        <RoundStepper
          label="Game session time"
          value={draft.sessionTime}
          suffix="s"
          min={GAME_OPTIONS_LIMITS.sessionTime.min}
          max={GAME_OPTIONS_LIMITS.sessionTime.max}
          step={GAME_OPTIONS_LIMITS.sessionTime.step}
          onChange={(value) => updateOption('sessionTime', value)}
        />

        <RoundStepper
          label="Enemy spawn time"
          value={draft.enemySpawnTime}
          suffix="s"
          min={GAME_OPTIONS_LIMITS.enemySpawnTime.min}
          max={GAME_OPTIONS_LIMITS.enemySpawnTime.max}
          step={GAME_OPTIONS_LIMITS.enemySpawnTime.step}
          onChange={(value) => updateOption('enemySpawnTime', value)}
        />
      </div>

      <div className="options-actions">
        <GameButton onClick={handleSave}>Save</GameButton>
        <GameButton variant="secondary" compact onClick={handleBack}>
          Main Menu
        </GameButton>
      </div>

      <p className="save-status" role="status" aria-live="polite">
        {saved ? 'Settings saved.' : 'Settings are stored locally for the next match.'}
      </p>
    </MenuPanel>
  )
}

export default OptionsScreen
