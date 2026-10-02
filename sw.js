/* Caleb's Arcade service worker.
   Shell + catalogue are precached so the front door opens offline.
   Thumbnails and previews are RUNTIME-cached (stale-while-revalidate below):
   the first online browse fills the cache, every later visit — online or
   offline — serves from it; a cold offline miss gets an inline placeholder,
   never a broken-image hole. Runtime strategy keeps install small and means
   regenerating a thumb never needs a SHELL edit or version bump here.
   The SHELL list must match the ?v= query the pages actually request —
   qa/_qwen/pwa-check.mjs gates that drift.
   Navigations are network-FIRST so a redeploy always wins; other same-origin
   GETs are cache-first with a background refresh. Games on the other live
   sites are cross-origin and are left to the network (their own sites cache
   them if they choose to). */
const VERSION = 'arcade-v14-prog3';
const SHELL = ['./', 'index.html', 'play.html', 'catalog.js', 'assets/site.css?v=prog-3', 'assets/playroom.css?v=prog-3', 'assets/profile.css?v=prog-3', 'assets/feature-kingdom.webp', 'assets/feature-neon.webp', 'assets/feature-claire.webp', 'assets/game-meta.json', 'assets/profile-core.js?v=prog-3', 'assets/profile-art.js?v=prog-3', 'assets/profile-ui.js?v=prog-3', 'assets/site.js?v=prog-3', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'assets/fonts/fredoka.woff2', 'assets/fonts/nunito.woff2'];
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
  // Offline + never-cached cover art: answer with an inline placeholder so the
  // hub reads as "not loaded yet", never as a wall of broken-image holes.
  const art = /\/assets\/(thumbs|previews)\//.test(new URL(req.url).pathname);
  const placeholder = () => new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300"><rect width="480" height="300" rx="18" fill="#151a2e"/><g fill="none" stroke="#6d4aff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"><circle cx="170" cy="140" r="34"/><path d="M232 140h72M268 108l36 32-36 32"/></g><text x="240" y="238" fill="#93a0c4" font-family="sans-serif" font-size="24" text-anchor="middle">Reconnect to load this art</text></svg>', { status: 200, headers: { 'content-type': 'image/svg+xml' } });
  e.respondWith(caches.match(req).then(hit => {
    const refresh = fetch(req).then(r => { if (r && r.ok) caches.open(VERSION).then(c => c.put(req, r.clone())); return r; }).catch(() => hit || (art ? placeholder() : new Response('Offline: this file has not been visited on this device yet.', { status: 504, headers: { 'content-type': 'text/plain' } })));
    return hit || refresh;
  }));
});
