import { useEffect, useState } from 'react'
import { useRegisterMatch } from '../api/queries'
import { readPendingMatches } from '../api/storage'

function PendingMatchNotice() {
  const registerMatch = useRegisterMatch()
  const [pendingCount, setPendingCount] = useState(() => readPendingMatches().length)

  useEffect(() => {
    if (registerMatch.isSuccess) {
      setPendingCount(readPendingMatches().length)
    }
  }, [registerMatch.isSuccess])

  if (pendingCount === 0) {
    return null
  }

  const retry = () => {
    const nextMatch = readPendingMatches()[0]

    if (nextMatch) {
      registerMatch.mutate(nextMatch)
    }
  }

  return (
    <div className="pending-match" role="status">
      <span>{pendingCount} match{pendingCount === 1 ? '' : 'es'} waiting to sync.</span>
      <button type="button" onClick={retry} disabled={registerMatch.isPending}>
        {registerMatch.isPending ? 'Retrying...' : 'Retry'}
      </button>
    </div>
  )
}

export default PendingMatchNotice
