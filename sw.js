// Caches the app shell so it opens instantly and offline. Product data always comes from the network.
const CACHE = 'pf-v1';
const SHELL = [
  './', 'index.html', 'app.css', 'manifest.webmanifest', 'icons/icon.svg',
  'src/main.js', 'src/report.js', 'src/scanner.js', 'src/store.js',
  'src/sources/openfoodfacts.js', 'src/sources/openprices.js', 'src/sources/label.js', 'src/services/ai.js',
  'src/geo/countries.js', 'src/geo/distance.js',
  'src/sections/index.js', 'src/sections/claims.js', 'src/sections/health.js', 'src/sections/processing.js',
  'src/sections/co2.js', 'src/sections/journey.js', 'src/sections/price.js', 'src/sections/nutrition.js',
  'src/sections/ai-claims.js',
];

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
));
self.addEventListener('fetch', (e) => {
  if (new URL(e.request.url).origin !== location.origin) return; // APIs: network only
  // Network first so updates show up straight away; cached copy when offline.
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request)));
});
