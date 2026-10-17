import { Table, TableHeader, TableBody, TableRow, TableHead } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { DeviceRow } from './DeviceRow'
import type { DeviceSecurityState } from '@/types/security'

interface Props {
  devices: DeviceSecurityState[]
  isLoading: boolean
}

export function DeviceTable({ devices, isLoading }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Device ID</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead>Last Seq</TableHead>
          <TableHead>Alerts</TableHead>
          <TableHead>Last Seen</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && devices.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 7 }).map((_, j) => (
                <td key={j} className="p-4">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </TableRow>
          ))
        ) : devices.length === 0 ? (
          <TableRow>
            <td colSpan={7} className="p-4 text-center text-muted-foreground">
              No devices found.
            </td>
          </TableRow>
        ) : (
          devices.map((device) => <DeviceRow key={device.deviceId} device={device} />)
        )}
      </TableBody>
    </Table>
  )
}