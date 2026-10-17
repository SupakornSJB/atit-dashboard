import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { startRound, endRound, getSecurityStatus } from '@/api/security'

export function GameControls() {
  const [loading, setLoading] = useState(false)
  const [lastAction, setLastAction] = useState<string | null>(null)

  const { data: status, refetch } = useQuery({
    queryKey: ['security-status-round'],
    queryFn: getSecurityStatus,
    refetchInterval: 3000,
  })

  const roundStatus = status?.round?.status?.toLowerCase() ?? 'idle'
  const phase = (roundStatus === 'running' || roundStatus === 'active') ? 'running' : roundStatus === 'ended' ? 'ended' : 'idle'

  async function handleStart() {
    setLoading(true)
    try {
      await startRound()
      setLastAction('Round started')
      refetch()
    } catch (e: any) {
      setLastAction(`Error: ${e?.response?.status ?? 'unknown'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleEnd() {
    setLoading(true)
    try {
      await endRound()
      setLastAction('Round ended')
      refetch()
    } catch (e: any) {
      setLastAction(`Error: ${e?.response?.status ?? 'unknown'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Status:</span>
        {phase === 'idle' && <Badge variant="secondary">Idle</Badge>}
        {phase === 'running' && <Badge variant="success">Running</Badge>}
        {phase === 'ended' && <Badge variant="destructive">Ended</Badge>}
      </div>
      <div className="flex gap-3">
        <Button onClick={handleStart} disabled={loading || phase === 'running'} variant="default" size="sm">
          Start Round
        </Button>
        <Button onClick={handleEnd} disabled={loading || phase !== 'running'} variant="secondary" size="sm">
          End Round
        </Button>
      </div>
      {lastAction && (
        <p className="text-sm text-muted-foreground">{lastAction}</p>
      )}
    </div>
  )
}
