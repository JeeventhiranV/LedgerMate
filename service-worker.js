/**
 * LedgerMate Service Worker – Offline-First PWA
 * ─────────────────────────────────────────────────────────────
 * Strategy:
 *  • HTML pages                        → Network-First (always fresh; cache = offline fallback)
 *  • Static assets (CSS/JS/fonts)     → Cache-First with background revalidate
 *  • API / network requests           → Network-First
 *  • Unmatched offline fallback       → cached index.html
 * ─────────────────────────────────────────────────────────────
 */
const CACHE_VERSION = 'lm-v2.19.2';
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
  './assets/icons/icon-study-192.png',
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
  './assets/vendor/drive.min.js',

  /* Core JS */
  './src/scripts/Core/AppBus.js',
  './src/scripts/Auth/AuthManager.js',
  './src/scripts/Auth/UserStore.js',
  './src/scripts/Auth/StorePatch.js',
  './src/scripts/Admin/AdminPanel.js',
  './src/scripts/CloudSync.js',
  './src/scripts/pwa-install.js',
  './src/scripts/pwa-push.js',
  './src/scripts/Common.js',
  './src/scripts/Wealth/Wealth.js',
  './src/scripts/Wealth/Essentials.js',
  './src/scripts/Investments.js',
  './src/scripts/Charts/Doughnut.js',
  './src/scripts/SpeechText/VoiceText.js',
  './src/scripts/Common/Notifications.js',
  './src/scripts/Common/Drive.js',
  './src/scripts/Common/GoldRateFetch.js',
  './src/scripts/Common/TripPlanner.js',
  './src/scripts/Common/Dropdown.js',
  './src/scripts/Common/MonthlySummary.js',
  './src/scripts/Common/Cred.js',
  './src/scripts/Common/Notes.js',
  './src/scripts/Common/Search.js',

  /* Auth (config excluded — see note below) */
  './auth/auth-guard.js',

  /* ── Study Module ─────────────────────────────────── */
  './study/index.html',
  './study/login.html',

  /* Study prep pages */
  './study/prep/DSA-Prep-Hub.html',
  './study/prep/Java-Prep-kit.html',
  './study/prep/React-Prep.html',
  './study/prep/HR-Questions.html',
  './study/prep/Interview-Prep-Kit.html',
  './study/prep/Interview-Tracker.html',
  './study/prep/Daily-Learning-Tracker.html',

  /* Study JS */
  './study/js/StudySync.js',
  './study/js/study-features.js',
  './study/js/community-hub.js',
  './study/js/lm-toast.js',
  './study/js/pwa-push.js',

  /* Study styles */
  './study/styles/Preparation.css',
  './study/styles/study-hub.css',

  /* Study data */
  './study/data/pdfs.json',

  /* NOTE: auth/supabase-config.js is intentionally excluded —
     it contains credentials and is generated fresh on each deploy.
     community-hub.js realtime channels are network-only by design. */
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

  /* supabase-config.js contains live credentials generated at deploy time.
     Never serve it from cache — always let the browser fetch it fresh so a
     new deploy is picked up immediately without a SW update cycle. */
  if (url.pathname.endsWith('/auth/supabase-config.js')) return;

  /* External / network-only origins — never cache */
  const NETWORK_ONLY_HOSTS = [
    'supabase.co',       // Supabase REST + Realtime
    'googleapis.com',    // Google fonts / APIs
    'jsdelivr.net',      // CDN libs (always fresh)
    'fonts.gstatic.com', // Google font files
  ];
  if (NETWORK_ONLY_HOSTS.some(h => url.hostname.includes(h))) return;

  /* External API calls (gold rates, etc.) → network only */
  if (url.pathname.startsWith('/api/') || url.hostname.includes('gold')) {
    return;
  }

  /* HTML pages → Network-First (always fetch fresh; cache = offline fallback only) */
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response && response.ok) {
            const toCache = response.clone(); // clone synchronously before body is consumed
            caches.open(CACHE_STATIC).then(c => c.put(event.request, toCache));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(c => c || caches.match('./index.html'))
        )
    );
    return;
  }

  /* Static assets (CSS/JS/fonts) → Cache-First with background revalidate */
  const isStaticAsset = STATIC_ASSETS.some(a => url.pathname.endsWith(a.replace('./', '/')));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) {
            fetch(event.request, { cache: 'no-store' })
              .then(fresh => {
                if (fresh && fresh.ok) {
                  const toCache = fresh.clone();
                  caches.open(CACHE_STATIC).then(c => c.put(event.request, toCache));
                }
              })
              .catch(() => {});
            return cached;
          }
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

/* ── Push: receive server-sent or local push ───────────────── */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}

  const title = data.title || 'LedgerMate';
  const opts  = {
    body    : data.body  || '',
    icon    : './assets/icons/icon-512.png',
    badge   : './assets/icons/icon-512.png',
    tag     : data.tag   || 'lm-push',
    renotify: true,
    data    : { url: data.url || './' },
    actions : data.actions || []
  };

  event.waitUntil(self.registration.showNotification(title, opts));
});

/* ── Notification click: focus or open the target URL ─────── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

/* ── Message: schedule a delayed local notification ────────── */
const _scheduled = new Map();

self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'schedule-notification') {
    const { title, body, timestamp, tag, url } = event.data;
    const delay = Math.max(0, timestamp - Date.now());
    const id    = tag || ('lm-sched-' + timestamp);

    /* Cancel any prior timer for the same tag */
    if (_scheduled.has(id)) clearTimeout(_scheduled.get(id));

    const timer = setTimeout(function () {
      _scheduled.delete(id);
      self.registration.showNotification(title || 'LedgerMate Reminder', {
        body    : body  || '',
        icon    : './assets/icons/icon-512.png',
        badge   : './assets/icons/icon-512.png',
        tag     : id,
        renotify: true,
        data    : { url: url || './' }
      });
    }, delay);

    _scheduled.set(id, timer);
  }

  if (event.data.type === 'cancel-notification') {
    const id = event.data.tag;
    if (_scheduled.has(id)) { clearTimeout(_scheduled.get(id)); _scheduled.delete(id); }
    self.registration.getNotifications({ tag: id }).then(ns => ns.forEach(n => n.close()));
  }
});
