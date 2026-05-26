/**
 * sw.js — Service Worker pour la PWA Poker Range
 *
 * Stratégie :
 * - index.html : toujours récupéré depuis le réseau (network-first)
 *   pour garantir que l'app est toujours à jour
 * - Assets JS/CSS : cache-first avec mise à jour en arrière-plan
 *   (ils ont des hash dans leur nom, donc pas de conflit)
 */

const CACHE_NAME = 'poker-range-v1'

// ─── Installation ────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
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

  // index.html → toujours depuis le réseau pour éviter le cache stale
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Met à jour le cache avec la nouvelle version
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => {
          // Hors ligne → sert depuis le cache
          return caches.match(event.request)
        })
    )
    return
  }

  // Assets JS/CSS/SVG → cache-first (ils ont des hash, toujours frais)
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
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

  // Tout le reste → réseau direct (requêtes Supabase, etc.)
  event.respondWith(fetch(event.request))
})