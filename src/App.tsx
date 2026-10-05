import { useState } from 'react'
import { loadGameOptions, type GameOptions } from './config/gameConfig'
import MainMenu, { type MenuDestination } from './screens/MainMenu'
import OptionsScreen from './screens/OptionsScreen'
import PlaceholderScreen from './screens/PlaceholderScreen'

type Screen = 'menu' | MenuDestination

function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [options, setOptions] = useState<GameOptions>(() => loadGameOptions())

  const goToMenu = () => setScreen('menu')

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

    if (screen === 'game') {
      return (
        <PlaceholderScreen
          title="Battle loading"
          message={`Match snapshot: ${options.sessionTime}s session, ${options.enemySpawnTime}s enemy spawn interval.`}
          onBack={goToMenu}
        />
      )
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

    return <MainMenu onNavigate={setScreen} />
  }

  return (
    <main className="app-shell">
      <div className="scene-overlay" />
      <div className="screen-content">{renderScreen()}</div>
      <img
        className="brand-logo"
        src="/logo_jungle_gaming.svg"
        alt="Jungle Gaming"
      />
    </main>
  )
}

export default App
