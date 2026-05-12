'use client'

import { useEffect } from 'react'

function runWhenIdle(callback: () => void) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 5000 })
    return
  }
  setTimeout(callback, 2500)
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister())
        })
      }
      return
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'imports' })
        .then((registration) => {
          if (
            !location.pathname.startsWith('/sign-in') &&
            !location.pathname.startsWith('/sign-up')
          ) {
            const notifyReadyWorker = () => {
              registration.active?.postMessage({ type: 'CACHE_APP_SHELL' })
            }

            runWhenIdle(() => {
              if (registration.active) {
                notifyReadyWorker()
              } else {
                navigator.serviceWorker.ready.then(notifyReadyWorker).catch(() => {})
              }
            })
          }
        })
        .catch(() => {})
    }
  }, [])

  return null
}
