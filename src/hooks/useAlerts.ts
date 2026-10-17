import { useQuery } from '@tanstack/react-query'
import { getSecurityStatus } from '@/api/security'

export const ALERTS_QUERY_KEY = ['alerts'] as const

export function useAlerts() {
  return useQuery({
    queryKey: ALERTS_QUERY_KEY,
    queryFn: async () => {
      const status = await getSecurityStatus()
      return status.alerts
    },
    refetchInterval: 3000,
  })
}