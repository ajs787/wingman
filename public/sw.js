// Minimal service worker — its job is to make Wingman installable (Add to Home
// Screen) and stay fresh. Strategy: network-first for page navigations, with a
// cached /login as the offline fallback. All other requests (assets, API, Next
// HMR) pass straight through, so this never serves stale app code.
const CACHE = 'wingman-shell-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/login'])).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.mode !== 'navigate') return; // only handle page loads

  event.respondWith(
    (async () => {
      try {
        return await fetch(request);
      } catch {
        const cache = await caches.open(CACHE);
        return (
          (await cache.match('/login')) ||
          new Response('You are offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        );
      }
    })()
  );
});
