/* Portal shell plus explicit per-game offline packages. */
const VERSION = 'arcade-mobile-offline-v1';
const SHELL = ['index.html', 'play.html', 'catalog.js', 'assets/site.css?v=prog-3', 'assets/playroom.css?v=prog-3', 'assets/profile.css?v=prog-3', 'assets/feature-kingdom.webp', 'assets/feature-neon.webp', 'assets/feature-claire.webp', 'assets/game-meta.json', 'assets/profile-core.js?v=prog-3', 'assets/profile-art.js?v=prog-3', 'assets/profile-ui.js?v=prog-3', 'assets/site.js?v=prog-3', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'assets/fonts/fredoka.woff2', 'assets/fonts/nunito.woff2', 'offline.html', 'assets/offline-client.js', 'assets/offline.css', 'offline-catalog.json'];
importScripts('./offline-manifest.js', './offline-worker.js');
