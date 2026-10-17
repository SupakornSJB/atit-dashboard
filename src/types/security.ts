export type AlertType =
  | 'CertMismatch'
  | 'RateExceeded'
  | 'SequenceGap'
  | 'UnknownSlot'
  | 'ValueOutOfRange'

export interface IntrusionAlert {
  deviceId: string
  alertType: AlertType
  detail: string
  timestamp: string
  shouldQuarantine: boolean
}

export interface DeviceSecurityState {
  deviceId: string
  isQuarantined: boolean
  quarantinedAt: string | null
  alertCount: number
  lastSeen: string | null
  currentRate: number
  lastSequenceNumber: number
}

export interface SecurityStatus {
  devices: DeviceSecurityState[]
  registeredDevices: string[]
  alerts: IntrusionAlert[]
  round: { status: string }
  timestamp: string
}