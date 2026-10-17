import { useEffect, useRef } from 'react'
import { AlertBadge } from './AlertBadge'
import { Skeleton } from '@/components/ui/skeleton'
import type { IntrusionAlert } from '@/types/security'

interface Props {
  alerts: IntrusionAlert[]
  isLoading: boolean
}

export function AlertFeed({ alerts, isLoading }: Props) {
  const prevCountRef = useRef(alerts.length)
  const newCountRef = useRef(0)

  useEffect(() => {
    newCountRef.current = Math.max(0, alerts.length - prevCountRef.current)
    prevCountRef.current = alerts.length
  }, [alerts.length])

  const displayed = alerts.slice(0, 100)

  return (
    <div className="flex flex-col gap-2">
      {isLoading && displayed.length === 0 ? (
        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
      ) : displayed.length === 0 ? (
        <p className="text-muted-foreground text-sm">No alerts yet.</p>
      ) : (
        displayed.map((alert, i) => (
          <AlertItem key={`${alert.deviceId}-${alert.timestamp}-${i}`} alert={alert} isNew={i < newCountRef.current} />
        ))
      )}
    </div>
  )
}

function AlertItem({ alert, isNew }: { alert: IntrusionAlert; isNew: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md border border-border bg-card p-3 text-sm ${isNew ? 'animate-pulse' : ''}`}
    >
      <AlertBadge type={alert.alertType} />
      <span className="font-mono text-foreground">{alert.deviceId}</span>
      <span className="flex-1 text-muted-foreground truncate">{alert.detail}</span>
      <span className="text-muted-foreground text-xs whitespace-nowrap">
        {new Date(alert.timestamp).toLocaleTimeString()}
      </span>
    </div>
  )
}