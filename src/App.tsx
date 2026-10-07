import { useState } from 'react'
import {
  createGameConfig,
  loadGameOptions,
  type GameConfig,
  type GameOptions,
} from './config/gameConfig'
import GameScreen from './screens/GameScreen'
import { applyE2EConfig } from './game/testing/testMode'
import HistoryScreen from './screens/HistoryScreen'
import MainMenu, { type MenuDestination } from './screens/MainMenu'
import OptionsScreen from './screens/OptionsScreen'
import RankingScreen from './screens/RankingScreen'

type Screen = 'menu' | MenuDestination

function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [options, setOptions] = useState<GameOptions>(() => loadGameOptions())
  const [matchConfig, setMatchConfig] = useState<GameConfig | null>(null)

  const goToMenu = () => {
    setMatchConfig(null)
    setScreen('menu')
  }

  const handleNavigate = (destination: MenuDestination) => {
    if (destination === 'game') {
      setMatchConfig(applyE2EConfig(createGameConfig(options)))
    }

    setScreen(destination)
  }

  const renderScreen = () => {
    if (screen === 'options') {
      return (
        <OptionsScreen
          options={options}
          onSave={setOptions}
          onBack={goToMenu}
        />
      )
    }

    if (screen === 'game' && matchConfig) {
      return <GameScreen config={matchConfig} onExit={goToMenu} />
    }

    if (screen === 'ranking') {
      return <RankingScreen options={options} onBack={goToMenu} />
    }

    if (screen === 'history') {
      return <HistoryScreen onBack={goToMenu} />
    }

    return <MainMenu onNavigate={handleNavigate} />
  }

  return (
    <main className="app-shell">
      <div className="scene-overlay" />
      <div className="screen-content">{renderScreen()}</div>
      {screen !== 'game' && (
        <img
          className="brand-logo"
          src="/logo_jungle_gaming.svg"
          alt="Jungle Gaming"
        />
      )}
    </main>
  )
}

export default App
