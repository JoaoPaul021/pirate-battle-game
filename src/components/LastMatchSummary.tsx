import { loadLastMatch } from '../api/storage'

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function LastMatchSummary() {
  const match = loadLastMatch()

  if (!match) {
    return null
  }

  return (
    <div className="last-match" aria-label="Last completed match">
      <span>Last match</span>
      <strong>{match.score} pts</strong>
      <small>
        {formatTime(match.durationSeconds)} · {match.reason === 'destroyed' ? 'Destroyed' : 'Time up'}
      </small>
    </div>
  )
}

export default LastMatchSummary
