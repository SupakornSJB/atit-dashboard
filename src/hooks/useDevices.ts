import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSecurityStatus } from '@/api/security'
import type { DeviceSecurityState } from '@/types/security'

export const DEVICES_QUERY_KEY = ['devices'] as const

export function useDevices() {
  return useQuery({
    queryKey: DEVICES_QUERY_KEY,
    queryFn: async () => {
      const status = await getSecurityStatus()
      const byId = new Map(status.devices.map((d) => [d.deviceId, d]))
      const registered = status.registeredDevices ?? status.devices.map((d) => d.deviceId)
      return registered.map(
        (id): DeviceSecurityState =>
          byId.get(id) ?? {
            deviceId: id,
            isQuarantined: false,
            quarantinedAt: null,
            alertCount: 0,
            lastSeen: null,
            currentRate: 0,
            lastSequenceNumber: 0,
          }
      )
    },
    refetchInterval: 3000,
  })
}

export function useUpdateDevice() {
  const queryClient = useQueryClient()
  return (updated: DeviceSecurityState) => {
    queryClient.setQueryData<DeviceSecurityState[]>(DEVICES_QUERY_KEY, (prev) => {
      if (!prev) return [updated]
      const idx = prev.findIndex((d) => d.deviceId === updated.deviceId)
      if (idx === -1) return [...prev, updated]
      const next = [...prev]
      next[idx] = updated
      return next
    })
  }
}