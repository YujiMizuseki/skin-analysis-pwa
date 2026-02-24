const CACHE_NAME = 'skin-ai-v5';  // bump to force cache refresh
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/camera.js',
  './js/faceDetector.js',
  './js/analyzers/nasolabialAnalyzer.js',
  './js/analyzers/cheekAnalyzer.js',
  './js/analyzers/boneStructureAnalyzer.js',
  './js/analyzers/wrinkleAnalyzer.js',
  './js/analyzers/skinAgeScorer.js',
  './js/results/reportGenerator.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
      .catch(() => caches.match('./index.html'))
  );
});
