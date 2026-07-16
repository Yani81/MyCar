// Прост service worker: network-first за документи, cache-first за статиката.
const CACHE = 'mycar-v7'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Не пипаме външни заявки (напр. към шрифтове/бъдещ Supabase)
  if (url.origin !== location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith(
      // no-cache: заобикаля HTTP кеша на GitHub Pages (max-age=600) —
      // ревалидация с ETag при всяко отваряне, новото се вижда веднага след деплой
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
          return res
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(self.registration.scope)))
    )
    return
  }

  e.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
          return res
        })
    )
  )
})
