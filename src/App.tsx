import { useState } from 'react'
import {
  createGameConfig,
  loadGameOptions,
  type GameConfig,
  type GameOptions,
} from './config/gameConfig'
import GameScreen from './screens/GameScreen'
import MainMenu, { type MenuDestination } from './screens/MainMenu'
import OptionsScreen from './screens/OptionsScreen'
import PlaceholderScreen from './screens/PlaceholderScreen'

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
      setMatchConfig(createGameConfig(options))
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
      return (
        <PlaceholderScreen
          title="Ranking"
          message="Ranking data will be connected to the mocked API in the next integration step."
          onBack={goToMenu}
        />
      )
    }

    if (screen === 'history') {
      return (
        <PlaceholderScreen
          title="Match History"
          message="Completed matches will appear here after the API integration step."
          onBack={goToMenu}
        />
      )
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
