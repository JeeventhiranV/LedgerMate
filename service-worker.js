/**
 * LedgerMate Service Worker – Offline-First PWA
 * ─────────────────────────────────────────────────────────────
 * Strategy:
 *  • Static shell (HTML/CSS/JS/libs) → Cache-First
 *  • API / network requests           → Network-First  
 *  • Unmatched offline fallback       → cached index.html
 * ─────────────────────────────────────────────────────────────
 */
const CACHE_VERSION = 'lm-v2.0.2';
const CACHE_STATIC  = `${CACHE_VERSION}-static`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './login.html',
  './widget.html',
  './manifest.json',

  /* Icons / PWA */
  './assets/icons/favicon.ico',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',

  /* Stylesheets */
  './src/styles/style.css',
  './src/styles/common.css',
  './src/styles/Notes.css',
  './src/styles/auth.css',

  /* Third-party libs */
  './assets/vendor/chart.umd.min.js',
  './assets/vendor/tailwind.min.js',
  './assets/vendor/jspdf.umd.min.js',
  './assets/vendor/html2canvas.min.js',

  /* Core JS */
  './src/scripts/Core/AppBus.js',
  './src/scripts/Auth/AuthManager.js',
  './src/scripts/Auth/UserStore.js',
  './src/scripts/Auth/StorePatch.js',
  './src/scripts/Admin/AdminPanel.js',
  './src/scripts/CloudSync.js',
  './src/scripts/Common.js',
  './src/scripts/Wealth/Wealth.js',
  './src/scripts/Wealth/Essentials.js',
  './src/scripts/Investments.js',
  './src/scripts/Charts/Doughnut.js',
  './src/scripts/SpeechText/VoiceText.js',
  './src/scripts/Common/Notifications.js',
  './src/scripts/Common/GoldRateFetch.js',
  './src/scripts/Common/TripPlanner.js',
  './src/scripts/Common/Dropdown.js',
  './src/scripts/Common/MonthlySummary.js',
  './src/scripts/Common/Cred.js',
  './src/scripts/Common/Notes.js',
  './src/scripts/Common/Search.js',

  /* NOTE: auth/supabase-config.js is intentionally excluded —
     it contains credentials and is generated fresh on each deploy. */
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

  /* External API calls (gold rates, Supabase) → network only */
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
