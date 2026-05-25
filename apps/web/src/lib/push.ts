import https from 'node:https'
import webpush from 'web-push'
import { PushSubscriptionModel } from '@doit/db'
import type { PushSubscribeRequest } from '@doit/types'

type PushRow = Record<string, unknown>

const applePushAgent = new https.Agent({ family: 4 })

export function isPushConfigured(): boolean {
  return Boolean(
    process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'] &&
      process.env['VAPID_PRIVATE_KEY'] &&
      process.env['VAPID_EMAIL'],
  )
}

export function configureWebPush(): void {
  const publicKey = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY']
  const privateKey = process.env['VAPID_PRIVATE_KEY']
  const email = process.env['VAPID_EMAIL']
  if (!publicKey || !privateKey || !email) throw new Error('Web Push is not configured')
  webpush.setVapidDetails(email, publicKey, privateKey)
}

export function validateSubscribeRequest(input: unknown): PushSubscribeRequest | null {
  const value = input as Partial<PushSubscribeRequest> | null
  if (!value || typeof value !== 'object') return null
  if (typeof value.endpoint !== 'string' || !value.endpoint.startsWith('https://')) return null
  if (!value.keys || typeof value.keys !== 'object') return null
  if (typeof value.keys.p256dh !== 'string' || typeof value.keys.auth !== 'string') return null

  return {
    endpoint: value.endpoint,
    expirationTime: typeof value.expirationTime === 'number' ? value.expirationTime : null,
    keys: {
      p256dh: value.keys.p256dh,
      auth: value.keys.auth,
    },
    deviceLabel: typeof value.deviceLabel === 'string' ? value.deviceLabel.slice(0, 120) : undefined,
    platform: typeof value.platform === 'string' ? value.platform.slice(0, 60) : undefined,
  }
}

export function toWebPushSubscription(row: PushRow): webpush.PushSubscription {
  return {
    endpoint: String(row['endpoint']),
    expirationTime: typeof row['expirationTime'] === 'number' ? row['expirationTime'] : null,
    keys: {
      p256dh: String(row['p256dh']),
      auth: String(row['auth']),
    },
  }
}

export async function disablePushSubscription(userId: string, endpoint: string, now = new Date().toISOString()) {
  await PushSubscriptionModel.findOneAndUpdate(
    { userId, endpoint },
    {
      $set: {
        enabled: false,
        disabledAt: now,
        updatedAt: now,
        lastFailureAt: now,
      },
    },
    { new: true },
  ).lean()
}

export async function markPushSuccess(userId: string, endpoint: string, now = new Date().toISOString()) {
  await PushSubscriptionModel.findOneAndUpdate(
    { userId, endpoint },
    {
      $set: {
        failureCount: 0,
        lastSuccessAt: now,
        updatedAt: now,
      },
    },
    { new: true },
  ).lean()
}

export async function markPushFailure(row: PushRow, statusCode?: number, now = new Date().toISOString()) {
  const userId = String(row['userId'])
  const endpoint = String(row['endpoint'])
  if (statusCode === 404 || statusCode === 410) {
    await disablePushSubscription(userId, endpoint, now)
    return
  }

  await PushSubscriptionModel.findOneAndUpdate(
    { userId, endpoint },
    {
      $set: {
        failureCount: Number(row['failureCount'] ?? 0) + 1,
        lastFailureAt: now,
        updatedAt: now,
      },
    },
    { new: true },
  ).lean()
}

export async function sendPush(row: PushRow, payload: Record<string, unknown>): Promise<'sent' | 'invalid' | 'failed'> {
  configureWebPush()
  const now = new Date().toISOString()
  const endpoint = String(row['endpoint'])
  const options = endpoint.startsWith('https://web.push.apple.com/')
    ? { agent: applePushAgent, timeout: 15000 }
    : undefined
  try {
    await webpush.sendNotification(toWebPushSubscription(row), JSON.stringify(payload), options)
    await markPushSuccess(String(row['userId']), endpoint, now)
    return 'sent'
  } catch (error) {
    const statusCode = typeof error === 'object' && error ? Number((error as { statusCode?: unknown }).statusCode) : undefined
    await markPushFailure(row, statusCode, now)
    return statusCode === 404 || statusCode === 410 ? 'invalid' : 'failed'
  }
}
