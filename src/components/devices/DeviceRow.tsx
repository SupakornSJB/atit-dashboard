import { TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DeviceActions } from './DeviceActions'
import type { DeviceSecurityState } from '@/types/security'

interface Props {
  device: DeviceSecurityState
}

export function DeviceRow({ device }: Props) {
  return (
    <TableRow className={device.isQuarantined ? 'bg-destructive/10' : ''}>
      <TableCell className="font-mono">{device.deviceId}</TableCell>
      <TableCell>{device.currentRate != null ? `${device.currentRate.toFixed(1)}/s` : '—'}</TableCell>
      <TableCell>{device.lastSequenceNumber != null ? device.lastSequenceNumber : '—'}</TableCell>
      <TableCell>{device.alertCount}</TableCell>
      <TableCell>
        {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : '—'}
      </TableCell>
      <TableCell>
        {device.isQuarantined ? (
          <Badge variant="destructive">Quarantined</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        )}
      </TableCell>
      <TableCell>
        <DeviceActions device={device} />
      </TableCell>
    </TableRow>
  )
}