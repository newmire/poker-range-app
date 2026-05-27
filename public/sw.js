/**
 * sw.js — Service Worker PWA Poker Range
 *
 * Stratégie par type de ressource :
 * - index.html → network-first (toujours à jour)
 * - Assets JS/CSS (avec hash) → cache-first (hash garantit la fraîcheur)
 * - Requêtes Supabase → réseau direct UNIQUEMENT (jamais en cache)
 * - Reste → réseau direct
 */

const CACHE_NAME = 'poker-range-v2'

// ─── Installation ────────────────────────────────────────────────────────────
self.addEventListener('install', () => {
  self.skipWaiting()
})

// ─── Activation ──────────────────────────────────────────────────────────────
// Supprime les anciens caches au démarrage
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Supabase → jamais en cache, toujours réseau direct
  // C'est critique — mettre en cache les requêtes Supabase casse l'auth
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(event.request))
    return
  }

  // index.html → network-first pour garantir la dernière version
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // Assets JS/CSS/SVG avec hash → cache-first
  // Les hash dans les noms de fichiers garantissent qu'un nouveau build
  // génère de nouveaux noms → pas de risque de version stale
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
      })
    )
    return
  }

  // Tout le reste → réseau direct
  event.respondWith(fetch(event.request))
})