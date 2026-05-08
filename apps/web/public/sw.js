const CACHE_VERSION = 'clarity-v2'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const PAGES_CACHE = `${CACHE_VERSION}-pages`

// Assets estáticos — cache-first
const STATIC_PATTERNS = [
  /^\/fonts\//,
  /\.(ico|png|svg|webp|woff2?)$/,
]
const NEXT_STATIC_PATTERN = /^\/_next\/static\//

// Páginas do app — network-first com fallback para cache
const APP_PAGES = ['/today', '/inbox', '/upcoming', '/projects', '/areas', '/audit', '/settings']

// Rotas de API — sempre network, nunca cache
const API_PATTERN = /^\/api\//

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(['/manifest.json'])
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('clarity-') && k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }

  const title = payload.title || 'doit.md'
  const options = {
    body: payload.body || 'Voce tem uma nova notificacao.',
    icon: payload.icon || '/icon/192',
    badge: payload.badge || '/icon/192',
    tag: payload.tag || 'doitmd',
    renotify: Boolean(payload.renotify),
    data: {
      url: payload.url || '/today',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/today', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === targetUrl)
      if (existing) return existing.focus()
      return self.clients.openWindow(targetUrl)
    })
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requests não-GET e cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // API — sempre rede, sem cache
  if (API_PATTERN.test(url.pathname)) return

  // Assets estáticos — cache-first
  if (STATIC_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  // Next assets change on deploy. Network-first avoids mixing a fresh runtime
  // with stale chunks cached by the PWA.
  if (NEXT_STATIC_PATTERN.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request)
          if (response.ok) cache.put(request, response.clone())
          return response
        } catch {
          const cached = await cache.match(request)
          return cached ?? Response.error()
        }
      })
    )
    return
  }

  // Páginas do app — network-first, fallback para cache
  if (request.mode === 'navigate' || APP_PAGES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(
      caches.open(PAGES_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request)
          if (response.ok) cache.put(request, response.clone())
          return response
        } catch {
          const cached = await cache.match(request)
          if (cached) return cached
          // Fallback para página raiz se offline e não há cache
          const root = await cache.match('/today')
          return root ?? Response.error()
        }
      })
    )
  }
})
