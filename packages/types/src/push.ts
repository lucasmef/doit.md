export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface PushSubscribeRequest {
  endpoint: string
  expirationTime?: number | null
  keys: PushSubscriptionKeys
  deviceLabel?: string
  platform?: string
}

export interface PushUnsubscribeRequest {
  endpoint: string
}

export interface PushSubscriptionRecord {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  expirationTime?: number | null
  userAgent?: string | null
  deviceLabel?: string | null
  platform?: string | null
  enabled: boolean
  failureCount: number
  lastSeenAt?: string | null
  lastSuccessAt?: string | null
  lastFailureAt?: string | null
  createdAt: string
  updatedAt: string
  disabledAt?: string | null
}

export interface PushStatusResponse {
  configured: boolean
  supported?: boolean
  subscribed: boolean
  activeDeviceCount: number
  currentDeviceEnabled: boolean
  devices: Array<{
    id: string
    deviceLabel?: string | null
    platform?: string | null
    lastSeenAt?: string | null
    createdAt: string
  }>
}
