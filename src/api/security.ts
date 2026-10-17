import { apiClient } from './client'
import type { SecurityStatus, DeviceSecurityState } from '@/types/security'

export async function getSecurityStatus(): Promise<SecurityStatus> {
  const res = await apiClient.get<SecurityStatus>('/security/status')
  return res.data
}

export async function quarantineDevice(deviceId: string): Promise<DeviceSecurityState> {
  const res = await apiClient.put<DeviceSecurityState>(`/security/devices/${deviceId}/quarantine?quarantine=true`)
  return res.data
}

export async function unquarantineDevice(deviceId: string): Promise<DeviceSecurityState> {
  const res = await apiClient.put<DeviceSecurityState>(`/security/devices/${deviceId}/quarantine?quarantine=false`)
  return res.data
}

export async function startRound(): Promise<void> {
  await apiClient.post('/admin/start')
}

export async function endRound(): Promise<void> {
  await apiClient.post('/admin/end')
}