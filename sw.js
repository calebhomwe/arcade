/* Caleb's Arcade service worker.
   Shell + catalogue + thumbnails are precached so the front door opens offline.
   Navigations are network-FIRST so a redeploy always wins; other same-origin
   GETs are cache-first with a background refresh. Games on the other live
   sites are cross-origin and are left to the network (their own sites cache
   them if they choose to). */
const VERSION = 'arcade-v7-playroom';
const SHELL = ['./', 'index.html', 'play.html', 'catalog.js', 'assets/site.css?v=playroom-7', 'assets/playroom.css?v=playroom-7', 'assets/feature-kingdom.webp', 'assets/site.js?v=playroom-7', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'assets/fonts/fredoka.woff2', 'assets/fonts/nunito.woff2'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('arcade-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const refresh = fetch(req).then(r => { if (r && r.ok) caches.open(VERSION).then(c => c.put(req, r.clone())); return r; }).catch(() => hit);
    return hit || refresh;
  }));
});
