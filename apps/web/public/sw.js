const CACHE_VERSION = 'clarity-v8'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const PAGES_CACHE = `${CACHE_VERSION}-pages`
const API_CACHE = `${CACHE_VERSION}-api`

// Static assets: cache-first.
const STATIC_PATTERNS = [/^\/fonts\//, /\.(ico|png|svg|webp|woff2?)$/]
const NEXT_STATIC_PATTERN = /^\/_next\/static\//

// App pages: cached-first so poor mobile connections do not block startup.
const APP_PAGES = [
  '/today',
  '/inbox',
  '/upcoming',
  '/calendar',
  '/notas',
  '/projects',
  '/areas',
  '/audit',
  '/settings',
]
const APP_SHELL_URLS = ['/', ...APP_PAGES]

// Read APIs that are useful offline. Mutating APIs stay network-only.
const API_PATTERN = /^\/api\//
const READ_API_PATTERNS = [
  /^\/api\/areas(?:\/[^/]+)?$/,
  /^\/api\/projects(?:\/[^/]+)?$/,
  /^\/api\/folders(?:\/[^/]+)?$/,
  /^\/api\/items(?:\/[^/]+)?$/,
  /^\/api\/items\/search$/,
  /^\/api\/items\/[^/]+\/versions$/,
  /^\/api\/calendar\/events$/,
  /^\/api\/google\/account$/,
  /^\/api\/notifications\/failures$/,
  /^\/api\/push\/status$/,
  /^\/api\/audit\/logs$/,
  /^\/api\/sync\/pending$/,
  /^\/api\/sync\/log$/,
]

function isAppPage(pathname) {
  return (
    pathname === '/' ||
    APP_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))
  )
}

function isReadApi(pathname) {
  return READ_API_PATTERNS.some((pattern) => pattern.test(pathname))
}

function isCacheablePageResponse(response) {
  return (
    response.ok &&
    !response.redirected &&
    (response.headers.get('content-type') || '').includes('text/html')
  )
}

function isCacheableJsonResponse(response) {
  return (
    response.ok &&
    !response.redirected &&
    (response.headers.get('content-type') || '').includes('application/json')
  )
}

async function fetchAndCache(cache, request, isCacheable) {
  const response = await fetch(request)
  if (isCacheable(response)) await cache.put(request, response.clone())
  return response
}

async function cachedFirst(request, cacheName, isCacheable, fallback) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    const refresh = fetchAndCache(cache, request, isCacheable).catch(() => null)
    return { response: cached, refresh }
  }

  try {
    return { response: await fetchAndCache(cache, request, isCacheable) }
  } catch {
    return { response: await fallback(cache) }
  }
}

async function networkFirst(request, cacheName, isCacheable, fallback) {
  const cache = await caches.open(cacheName)

  try {
    return await fetchAndCache(cache, request, isCacheable)
  } catch {
    return (await cache.match(request)) ?? fallback()
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(['/manifest.json', '/api/icon/192', '/api/icon/512']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('clarity-') &&
                key !== STATIC_CACHE &&
                key !== PAGES_CACHE &&
                key !== API_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_APP_SHELL') return

  event.waitUntil(
    caches.open(PAGES_CACHE).then(async (cache) => {
      for (const url of APP_SHELL_URLS) {
        try {
          const response = await fetch(url, { credentials: 'same-origin' })
          if (isCacheablePageResponse(response)) await cache.put(url, response)
        } catch {
          break
        }
      }
    }),
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
    icon: payload.icon || '/api/icon/192',
    badge: payload.badge || '/api/icon/192',
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
    }),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/api/icon/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }),
    )
    return
  }

  if (API_PATTERN.test(url.pathname)) {
    if (!isReadApi(url.pathname)) return

    event.respondWith(
      networkFirst(request, API_CACHE, isCacheableJsonResponse, () =>
        new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    return
  }

  if (STATIC_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }),
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
      }),
    )
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      cachedFirst(request, PAGES_CACHE, isCacheablePageResponse, async (cache) => {
        const root = await cache.match('/today')
        return root ?? cache.match('/') ?? Response.error()
      }).then(({ response, refresh }) => {
        if (refresh) event.waitUntil(refresh)
        return response
      }),
    )
    return
  }

  if (isAppPage(url.pathname)) {
    event.respondWith(
      caches.open(PAGES_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request)
          if (isCacheablePageResponse(response)) cache.put(request, response.clone())
          return response
        } catch {
          return (await cache.match(request)) ?? Response.error()
        }
      }),
    )
  }
})
