import { useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { DeviceTable } from '@/components/devices/DeviceTable'
import { AlertFeed } from '@/components/alerts/AlertFeed'
import { GameControls } from '@/components/game/GameControls'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useDevices, useUpdateDevice } from '@/hooks/useDevices'
import { useAlerts } from '@/hooks/useAlerts'
import { useSecurityHub } from '@/hooks/useSecurityHub'
import { useQueryClient } from '@tanstack/react-query'
import { ALERTS_QUERY_KEY } from '@/hooks/useAlerts'
import type { IntrusionAlert, DeviceSecurityState } from '@/types/security'

type Section = 'devices' | 'alerts' | 'game'

export function DashboardPage() {
  const [section, setSection] = useState<Section>('devices')
  const { data: devices = [], isLoading: devicesLoading } = useDevices()
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts()
  const updateDevice = useUpdateDevice()
  const queryClient = useQueryClient()

  const handleAlert = useCallback(
    (alert: IntrusionAlert) => {
      queryClient.setQueryData<IntrusionAlert[]>(ALERTS_QUERY_KEY, (prev) =>
        prev ? [alert, ...prev].slice(0, 100) : [alert]
      )
    },
    [queryClient]
  )

  const handleDeviceStateChanged = useCallback(
    (state: DeviceSecurityState) => {
      updateDevice(state)
    },
    [updateDevice]
  )

  useSecurityHub({ onAlert: handleAlert, onDeviceStateChanged: handleDeviceStateChanged })

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={section} onChange={setSection} />
        <main className="flex-1 overflow-auto p-6">
          {section === 'devices' && (
            <Card>
              <CardHeader>
                <CardTitle>Device Security Status</CardTitle>
              </CardHeader>
              <CardContent>
                <DeviceTable devices={devices} isLoading={devicesLoading} />
              </CardContent>
            </Card>
          )}
          {section === 'alerts' && (
            <Card>
              <CardHeader>
                <CardTitle>Real-time Alert Feed</CardTitle>
              </CardHeader>
              <CardContent>
                <AlertFeed alerts={alerts} isLoading={alertsLoading} />
              </CardContent>
            </Card>
          )}
          {section === 'game' && (
            <Card>
              <CardHeader>
                <CardTitle>Game Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <GameControls />
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}