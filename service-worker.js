/**
 * LedgerMate Service Worker – Network-First (No Caching)
 * ─────────────────────────────────────────────────────────────
 * All requests pass through to the network.
 * Nothing is cached. Always loads the latest version.
 * ─────────────────────────────────────────────────────────────
 */

/* ── Install: skip waiting immediately ───────────────────── */
self.addEventListener('install', () => self.skipWaiting());

/* ── Activate: delete ALL existing caches ────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

/* ── Fetch: always go to network, never cache ────────────── */
self.addEventListener('fetch', () => { /* no-op — browser handles natively */ });
