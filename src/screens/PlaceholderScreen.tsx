import GameButton from '../components/GameButton'
import MenuPanel from '../components/MenuPanel'

type PlaceholderScreenProps = {
  title: string
  message: string
  onBack: () => void
}

function PlaceholderScreen({ title, message, onBack }: PlaceholderScreenProps) {
  return (
    <MenuPanel className="placeholder-panel" labelledBy="placeholder-title">
      <div className="screen-heading">
        <span>Pirate Battle</span>
        <h1 id="placeholder-title">{title}</h1>
      </div>
      <p className="placeholder-message">{message}</p>
      <GameButton onClick={onBack}>Main Menu</GameButton>
    </MenuPanel>
  )
}

export default PlaceholderScreen
