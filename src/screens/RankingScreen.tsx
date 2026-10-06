import { useEffect, useState } from 'react'
import type { GameOptions } from '../config/gameConfig'
import GameButton from '../components/GameButton'
import MenuPanel from '../components/MenuPanel'
import NetworkScenarioControl from '../components/NetworkScenarioControl'
import Pagination from '../components/Pagination'
import { PLAYER_ID } from '../api/contracts'
import { useRanking } from '../api/queries'

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

type RankingScreenProps = {
  options: GameOptions
  onBack: () => void
}

function RankingScreen({ options, onBack }: RankingScreenProps) {
  const [page, setPage] = useState(1)
  const ranking = useRanking(options, page)


  useEffect(() => {
    if (ranking.data && page > ranking.data.totalPages) {
      setPage(ranking.data.totalPages)
    }
  }, [page, ranking.data])

  return (
    <MenuPanel className="data-panel ranking-panel" labelledBy="ranking-title">
      <div className="screen-heading data-heading">
        <span>Current ruleset</span>
        <h1 id="ranking-title">Ranking</h1>
        <p>{options.sessionTime}s match · {options.enemySpawnTime}s spawn</p>
      </div>

      <div className="data-content" aria-live="polite">
        {ranking.isPending && <p className="data-state">Loading ranking...</p>}

        {ranking.isError && (
          <div className="data-state data-state--error" role="alert">
            <strong>Ranking unavailable</strong>
            <span>Check the selected network scenario and try again.</span>
            <button type="button" onClick={() => void ranking.refetch()}>Try Again</button>
          </div>
        )}

        {ranking.data && ranking.data.items.length === 0 && (
          <p className="data-state">No completed matches for this configuration yet.</p>
        )}

        {ranking.data && ranking.data.items.length > 0 && (
          <ol className="ranking-list" start={(ranking.data.page - 1) * ranking.data.pageSize + 1}>
            {ranking.data.items.map((entry) => (
              <li
                key={entry.id}
                className={entry.playerId === PLAYER_ID ? 'is-player' : undefined}
              >
                <span className="ranking-position">#{entry.position}</span>
                <span className="ranking-player">
                  <strong>{entry.playerName}</strong>
                  <small>{new Date(entry.completedAt).toLocaleDateString()}</small>
                </span>
                <span className="ranking-duration">{formatDuration(entry.durationSeconds)}</span>
                <strong className="ranking-score">{entry.score} pts</strong>
              </li>
            ))}
          </ol>
        )}
      </div>

      {ranking.data && (
        <Pagination
          page={ranking.data.page}
          totalPages={ranking.data.totalPages}
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

export default RankingScreen
