'use client'

import { useEffect } from 'react'

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
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          if (
            !location.pathname.startsWith('/sign-in') &&
            !location.pathname.startsWith('/sign-up')
          ) {
            const notifyReadyWorker = () => {
              registration.active?.postMessage({ type: 'CACHE_APP_SHELL' })
            }

            if (registration.active) {
              notifyReadyWorker()
            } else {
              navigator.serviceWorker.ready.then(notifyReadyWorker).catch(() => {})
            }
          }
        })
        .catch(() => {})
    }
  }, [])

  return null
}
