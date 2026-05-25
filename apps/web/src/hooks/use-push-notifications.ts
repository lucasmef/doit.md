'use client'

import useSWR from 'swr'
import type { PushStatusResponse } from '@doit/types'

type PermissionState = NotificationPermission | 'unsupported' | 'needs-install-ios' | 'unconfigured'

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as NavigatorWithStandalone).standalone)
}

function getPlatformLabel(): string {
  if (isIosDevice()) return 'ios'
  if (typeof navigator === 'undefined') return 'unknown'
  if (/Android/i.test(navigator.userAgent)) return 'android'
  if (/Macintosh|Mac OS X/i.test(navigator.userAgent)) return 'macos'
  if (/Windows/i.test(navigator.userAgent)) return 'windows'
  return 'web'
}

function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Browser'
  if (isIosDevice()) return 'iPhone/iPad'
  if (/Edg\//.test(navigator.userAgent)) return 'Microsoft Edge'
  if (/Chrome\//.test(navigator.userAgent)) return 'Google Chrome'
  if (/Safari\//.test(navigator.userAgent)) return 'Safari'
  if (/Firefox\//.test(navigator.userAgent)) return 'Firefox'
  return 'Browser'
}

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

function bytesEqual(left: ArrayBuffer | null, right: Uint8Array<ArrayBuffer>): boolean {
  if (!left) return false
  const leftBytes = new Uint8Array(left)
  if (leftBytes.length !== right.length) return false
  for (let index = 0; index < leftBytes.length; index += 1) {
    if (leftBytes[index] !== right[index]) return false
  }
  return true
}

function getClientSupport(): PermissionState {
  if (typeof window === 'undefined') return 'unsupported'
  if (!window.isSecureContext) return 'unsupported'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (isIosDevice() && !isStandalonePwa()) return 'needs-install-ios'
  return Notification.permission
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error ?? fallback
  } catch {
    return fallback
  }
}

async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.getRegistration('/')
  if (registration) return registration
  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.getRegistration('/')
  return registration?.pushManager.getSubscription() ?? null
}

async function removeSubscription(subscription: PushSubscription): Promise<void> {
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
  await subscription.unsubscribe()
}

export function usePushNotifications() {
  const support = getClientSupport()
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const subscriptionKey = typeof window === 'undefined' ? null : '/api/push/status'

  const { data, error, isLoading, mutate } = useSWR<PushStatusResponse>(subscriptionKey, async () => {
    const subscription = await getCurrentSubscription()
    if (subscription && publicKey && !bytesEqual(subscription.options.applicationServerKey, urlBase64ToUint8Array(publicKey))) {
      await removeSubscription(subscription)
      return fetcher('/api/push/status')
    }
    const query = subscription ? `?endpoint=${encodeURIComponent(subscription.endpoint)}` : ''
    return fetcher(`/api/push/status${query}`)
  })

  async function enable() {
    if (support === 'unsupported') throw new Error('Este navegador nao suporta notificacoes push.')
    if (support === 'needs-install-ios') throw new Error('Instale o app na Tela de Inicio do iPhone antes de ativar notificacoes.')
    if (!publicKey) throw new Error('A chave publica VAPID nao esta configurada.')

    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (permission !== 'granted') throw new Error('Permissao de notificacao nao concedida.')

    const registration = await getOrRegisterServiceWorker()
    const applicationServerKey = urlBase64ToUint8Array(publicKey)
    const existing = await registration.pushManager.getSubscription()
    if (existing && !bytesEqual(existing.options.applicationServerKey, applicationServerKey)) {
      await removeSubscription(existing)
    }
    const current = await registration.pushManager.getSubscription()
    const subscription = current ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })

    const payload = subscription.toJSON()
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        expirationTime: payload.expirationTime ?? null,
        keys: payload.keys,
        deviceLabel: getDeviceLabel(),
        platform: getPlatformLabel(),
      }),
    })
    if (!res.ok) throw new Error(await readError(res, 'Falha ao ativar notificacoes.'))
    await mutate()
  }

  async function disable() {
    const subscription = await getCurrentSubscription()
    if (subscription) {
      await removeSubscription(subscription)
    }
    await mutate()
  }

  async function sendTest() {
    const res = await fetch('/api/push/test', { method: 'POST' })
    if (!res.ok) throw new Error(await readError(res, 'Falha ao enviar teste.'))
    await mutate()
    return res.json() as Promise<{ sent: number; invalid: number; failed: number }>
  }

  return {
    support,
    isIos: typeof window !== 'undefined' && isIosDevice(),
    isStandalone: typeof window !== 'undefined' && isStandalonePwa(),
    status: data,
    isLoading,
    isError: Boolean(error),
    enable,
    disable,
    sendTest,
  }
}
