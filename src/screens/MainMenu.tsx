import GameButton from '../components/GameButton'
import LastMatchSummary from '../components/LastMatchSummary'
import MenuPanel from '../components/MenuPanel'
import PendingMatchNotice from '../components/PendingMatchNotice'

export type MenuDestination = 'game' | 'options' | 'ranking' | 'history'

type MainMenuProps = {
  onNavigate: (destination: MenuDestination) => void
}

function MainMenu({ onNavigate }: MainMenuProps) {
  return (
    <MenuPanel className="main-menu" labelledBy="game-title">
      <img
        className="title-art"
        src="/png/default/ui/menu/title_pirate_battle.png"
        alt="Pirate Battle"
      />
      <h1 id="game-title" className="sr-only">
        Pirate Battle
      </h1>
      <p className="menu-tagline">Set sail. Take command.</p>

      <div className="main-actions">
        <GameButton onClick={() => onNavigate('game')}>Play</GameButton>
        <GameButton onClick={() => onNavigate('options')}>Options</GameButton>
      </div>

      <div className="control-guide" aria-label="Game controls">
        <p>Navigate the islands. Survive the battle.</p>
        <div className="control-grid">
          <span><kbd>W</kbd> Sail</span>
          <span><kbd>A</kbd><kbd>D</kbd> Turn</span>
          <span><kbd>Space</kbd> Front fire</span>
          <span><kbd>Q</kbd><kbd>E</kbd> Broadside</span>
        </div>
      </div>

      <LastMatchSummary />
      <PendingMatchNotice />

      <div className="secondary-actions">
        <GameButton
          variant="secondary"
          compact
          onClick={() => onNavigate('ranking')}
        >
          Ranking
        </GameButton>
        <GameButton
          variant="secondary"
          compact
          onClick={() => onNavigate('history')}
        >
          Match History
        </GameButton>
      </div>
    </MenuPanel>
  )
}

export default MainMenu
