import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { useAuthStore } from '@/store/authStore'
import type { IntrusionAlert, DeviceSecurityState } from '@/types/security'

interface SecurityHubCallbacks {
  onAlert: (alert: IntrusionAlert) => void
  onDeviceStateChanged: (state: DeviceSecurityState) => void
}

export function useSecurityHub(callbacks: SecurityHubCallbacks) {
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const token = useAuthStore((s) => s.token)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    if (!token) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/security', {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect([0, 1000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connection.on('OnAlert', (alert: IntrusionAlert) => callbacksRef.current.onAlert(alert))
    connection.on('OnDeviceStateChanged', (state: DeviceSecurityState) =>
      callbacksRef.current.onDeviceStateChanged(state)
    )

    connection
      .start()
      .then(() => console.log('[SignalR] Connected to SecurityHub'))
      .catch((err) => console.error('[SignalR] Connection failed:', err))

    connectionRef.current = connection

    return () => {
      connection.stop()
    }
  }, [token])

  return connectionRef
}