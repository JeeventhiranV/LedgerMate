self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('ledgermate-cache').then(cache => {
      return cache.addAll([
        'LedgerMate/index.html',
        'LedgerMate/manifest.json',
        'LedgerMate/icons/icon-512.png',
        'LedgerMate/icons/icon-192.png',
        'LedgerMate/libs/tailwind.min.js',
        'LedgerMate/libs/chart.min.js',
        // add any other CSS/JS/images you use
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      // Return cache first, fallback to network (for local fetch, network will fail gracefully)
      return response || fetch(e.request).catch(() => {
        // Optional: fallback offline page if request not in cache
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
