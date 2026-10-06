import { useEffect, useState } from 'react'
import GameButton from '../components/GameButton'
import MenuPanel from '../components/MenuPanel'
import NetworkScenarioControl from '../components/NetworkScenarioControl'
import Pagination from '../components/Pagination'
import { useMatchHistory } from '../api/queries'

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

type HistoryScreenProps = {
  onBack: () => void
}

function HistoryScreen({ onBack }: HistoryScreenProps) {
  const [page, setPage] = useState(1)
  const history = useMatchHistory(page)


  useEffect(() => {
    if (history.data && page > history.data.totalPages) {
      setPage(history.data.totalPages)
    }
  }, [history.data, page])

  return (
    <MenuPanel className="data-panel history-panel" labelledBy="history-title">
      <div className="screen-heading data-heading">
        <span>Joao Paulo</span>
        <h1 id="history-title">Match History</h1>
        <p>Completed matches registered by the mock API.</p>
      </div>

      <div className="data-content" aria-live="polite">
        {history.isPending && <p className="data-state">Loading match history...</p>}

        {history.isError && (
          <div className="data-state data-state--error" role="alert">
            <strong>History unavailable</strong>
            <span>Check the selected network scenario and try again.</span>
            <button type="button" onClick={() => void history.refetch()}>Try Again</button>
          </div>
        )}

        {history.data && history.data.items.length === 0 && (
          <p className="data-state">No completed matches registered yet.</p>
        )}

        {history.data && history.data.items.length > 0 && (
          <div className="history-list">
            {history.data.items.map((match) => (
              <article key={match.id}>
                <div>
                  <strong>{match.score} pts</strong>
                  <span>{new Date(match.completedAt).toLocaleString()}</span>
                </div>
                <dl>
                  <div><dt>Duration</dt><dd>{formatDuration(match.durationSeconds)}</dd></div>
                  <div><dt>Ended by</dt><dd>{match.reason === 'destroyed' ? 'Destroyed' : 'Time'}</dd></div>
                  <div><dt>Session</dt><dd>{Math.round(match.config.sessionDurationMs / 1000)}s</dd></div>
                  <div><dt>Spawn</dt><dd>{Math.round(match.config.enemies.spawnIntervalMs / 1000)}s</dd></div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>

      {history.data && (
        <Pagination
          page={history.data.page}
          totalPages={history.data.totalPages}
          onChange={setPage}
        />
      )}

      <div className="data-footer">
        <GameButton variant="secondary" compact onClick={onBack}>Back</GameButton>
        <NetworkScenarioControl />
      </div>
    </MenuPanel>
  )
}

export default HistoryScreen
