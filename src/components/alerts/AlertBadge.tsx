import { Badge } from '@/components/ui/badge'
import type { AlertType } from '@/types/security'

const variantMap: Record<AlertType, 'destructive' | 'warning' | 'secondary'> = {
  CertMismatch: 'destructive',
  RateExceeded: 'destructive',
  UnknownSlot: 'warning',
  SequenceGap: 'secondary',
  ValueOutOfRange: 'secondary',
}

export function AlertBadge({ type }: { type: AlertType }) {
  return <Badge variant={variantMap[type]}>{type}</Badge>
}