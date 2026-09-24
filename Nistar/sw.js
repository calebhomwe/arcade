// Nistar service worker — offline-first cache for the core shell.
const VERSION = 'v49-landscape-rail-fit';
const CACHE = 'hg-' + VERSION;
const CORE = [
  './index.html',
  './charts.json',
  './manifest.webmanifest',
  './icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-180.png',
  './assets/keyart/nistar-max-resurrection-dawn.webp',
  './assets/keyart/nistar-crisp-resurrection-dawn.webp',
  './assets/keyart/nistar-max-crystal-river.webp',
  './assets/keyart/nistar-max-still-waters.webp',
  './assets/keyart/nistar-loading-rise-faith-violet-city.jpg',
  './assets/keyart/nistar-loading-red-sea-teal-warrior.jpg',
  './assets/keyart/nistar-loading-cathedral-moon-blue.jpg',
  './assets/keyart/nistar-loading-anime-heaven-violet.webp',
  './assets/keyart/nistar-loading-golden-kingdom-hero.webp',
  './assets/keyart/nistar-loading-blue-cathedral-knight.webp',
  './assets/keyart/nistar-loading-red-cathedral-warrior.jpg',
  './assets/keyart/nistar-stage-new-jerusalem-clouds.webp',
  './assets/keyart/nistar-stage-red-sea-sunpath.webp',
  './assets/keyart/nistar-stage-eden-river-lions.webp',
  './assets/keyart/nistar-stage-bethlehem-star-town.jpg',
  './assets/keyart/nistar-stage-sinai-glory-mountain.jpg',
  './assets/keyart/nistar-stage-heavenly-city-gold.webp',
  './assets/keyart/nistar-stage-eden-light-path.webp',
  './assets/keyart/nistar-stage-sinai-causeway.webp',
  './assets/keyart/nistar-stage-bethlehem-road-star.webp',
  './assets/keyart/nistar-stage-heaven-road-causeway.webp',
  './assets/keyart/nistar-stage-red-sea-banner-road.webp',
  './assets/keyart/nistar-stage-galilee-sunrise.jpg',
  './assets/keyart/nistar-stage-red-sea-cross-causeway.webp',
  './assets/keyart/nistar-stage-bethlehem-night-road.webp',
  './assets/keyart/nistar-stage-sinai-fire-road.webp',
  './assets/cutscenes/nistar-red-sea-lightbreak-seedance-fast.mp4',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Bypass cross-origin (CDN, Google Fonts) — let the network handle them with HTTP cache.
  if (url.origin !== location.origin) return;
  const isShellDoc = url.pathname.endsWith('/index.html') || url.pathname.endsWith('/') || url.pathname.endsWith('/charts.json');
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isShellDoc) {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.status === 200 && fresh.type !== 'opaque') {
          cache.put(req, fresh.clone()).catch(() => null);
        }
        return fresh;
      } catch {
        return (await cache.match(req)) || fetch(req);
      }
    }
    const cached = await cache.match(req);
    const network = fetch(req).then(res => {
      if (res && res.status === 200 && res.type !== 'opaque') {
        cache.put(req, res.clone()).catch(() => null);
      }
      return res;
    }).catch(() => cached);
    return cached || network;
  })());
});
