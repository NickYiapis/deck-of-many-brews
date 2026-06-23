const APP_VERSION = 'v162';
const CACHE_NAME = 'deck-of-many-brews-v162-stability-recovery';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './version.json', './icons/icon.svg'];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME && key.startsWith('deck-of-many-brews-')).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CACHE_LATEST') {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => event.ports && event.ports[0] && event.ports[0].postMessage({ok:true})).catch(() => event.ports && event.ports[0] && event.ports[0].postMessage({ok:false})));
  }
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => null);
    return response;
  }).catch(() => caches.match('./index.html'))));
});
