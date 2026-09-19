/* Caleb's Arcade service worker.
   The shelf advertises "fully offline", so every cabinet the player has actually
   opened should keep working with no network. Deliberately conservative:

   - Navigations are network-FIRST, so a redeploy is picked up on the next online
     visit and a stale HTML page can never pin the arcade to an old build.
   - Everything else is cache-first with a background refresh, because the game
     assets are content-addressed or effectively immutable.
   - Only same-origin GETs are touched; anything else falls through untouched.
   - The cache name is versioned and every other cache is dropped on activate,
     so shipping a new VERSION is all it takes to invalidate the old one. */
const VERSION = 'arcade-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const hit = await caches.match(req);
        return hit || caches.match('index.html');
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) {
      // refresh in the background; a failure here must never break the response
      fetch(req).then((res) => {
        if (res && res.ok) caches.open(VERSION).then((c) => c.put(req, res));
      }).catch(() => {});
      return hit;
    }
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(VERSION);
      cache.put(req, res.clone());
    }
    return res;
  })());
});
