/**
 * LedgerMate Service Worker – Offline-First PWA
 * ─────────────────────────────────────────────────────────────
 * Strategy:
 *  • Static shell (HTML/CSS/JS/libs) → Cache-First
 *  • API / network requests           → Network-First  
 *  • Unmatched offline fallback       → cached index.html
 * ─────────────────────────────────────────────────────────────
 */
const CACHE_VERSION = 'lm-v5';
const CACHE_STATIC  = `${CACHE_VERSION}-static`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',

  /* Stylesheets */
  './css/style.css',
  './css/common.css',
  './css/Notes.css',
  './css/auth.css',

  /* Third-party libs */
  './libs/chart.umd.min.js',
  './libs/tailwind.min.js',

  /* Core JS – load order matters at runtime but not in cache */
  './js/Core/AppBus.js',
  './js/Auth/AuthManager.js',
  './js/Auth/UserStore.js',
  './js/Auth/StorePatch.js',
  './js/Admin/AdminPanel.js',
  './js/Common/Drive.js',
  './js/Common.js',
  './js/Wealth/Wealth.js',
  './js/Wealth/Essentials.js',
  './js/Investments.js',
  './js/Charts/Doughnut.js',
  './js/SpeechText/VoiceText.js',
  './js/Common/Notifications.js',
  './js/Common/GoldRateFetch.js',
  './js/Common/TripPlanner.js',
  './js/Common/Dropdown.js',
  './js/Common/MonthlySummary.js',
  './js/Common/Cred.js',
  './js/Common/Notes.js',
];

/* ── Install: pre-cache all static assets ─────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => {
        console.warn('[SW] Pre-cache failed (some assets may be missing):', err);
        return self.skipWaiting();
      })
  );
});

/* ── Activate: purge stale caches ─────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('lm-') && k !== CACHE_STATIC)
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      ))
      .then(() => clients.claim())
  );
});

/* ── Fetch: cache-first for static, network-first for rest ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Only handle same-origin GET requests */
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  /* External API calls (gold rates, Drive) → network only */
  if (url.pathname.startsWith('/api/') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gold')) {
    return; /* Let browser handle natively */
  }

  /* Static assets → Cache-First with network fallback */
  const isStaticAsset = STATIC_ASSETS.some(a => url.pathname.endsWith(a.replace('./', '/')));

  if (isStaticAsset || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          /* Return cached version immediately if available */
          if (cached) {
            /* Background-revalidate in parallel */
            fetch(event.request, { cache: 'no-store' })
              .then(fresh => {
                if (fresh && fresh.ok) {
                  caches.open(CACHE_STATIC).then(c => c.put(event.request, fresh.clone()));
                }
              })
              .catch(() => {});
            return cached;
          }
          /* Not cached → fetch from network and cache */
          return fetch(event.request, { cache: 'no-store' })
            .then(response => {
              if (!response || !response.ok) return response;
              const toCache = response.clone();
              caches.open(CACHE_STATIC).then(c => c.put(event.request, toCache));
              return response;
            })
            .catch(() => caches.match('./index.html'));
        })
    );
    return;
  }

  /* Everything else → Network-First with cache fallback */
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        if (response && response.ok) {
          const toCache = response.clone();
          caches.open(CACHE_STATIC).then(c => c.put(event.request, toCache));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(c => c || caches.match('./index.html'))
      )
  );
});
