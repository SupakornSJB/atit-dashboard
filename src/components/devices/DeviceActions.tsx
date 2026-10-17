import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { quarantineDevice, unquarantineDevice } from '@/api/security'
import { useUpdateDevice } from '@/hooks/useDevices'
import type { DeviceSecurityState } from '@/types/security'

interface Props {
  device: DeviceSecurityState
}

export function DeviceActions({ device }: Props) {
  const [loading, setLoading] = useState(false)
  const updateDevice = useUpdateDevice()

  async function handleToggle() {
    setLoading(true)
    try {
      const updated = device.isQuarantined
        ? await unquarantineDevice(device.deviceId)
        : await quarantineDevice(device.deviceId)
      updateDevice(updated)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={device.isQuarantined ? 'outline' : 'destructive'}
      size="sm"
      disabled={loading}
      onClick={handleToggle}
    >
      {device.isQuarantined ? 'Unquarantine' : 'Quarantine'}
    </Button>
  )
}
