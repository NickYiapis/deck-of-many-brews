/* D&D Homebrew Compendium service worker - prompt-controlled updates */
const APP_VERSION = 'v121-pwa.1';
const CACHE_PREFIX = 'homebrew-compendium-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './version.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(name => {
      if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) return caches.delete(name);
      return Promise.resolve(false);
    }));
    await self.clients.claim();
  })());
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

function isShellUrl(url) {
  const pathname = url.pathname.split('/').pop() || 'index.html';
  return ['index.html', 'app.css', 'app.js', 'manifest.webmanifest', 'version.json', 'icon-192.png', 'icon-512.png'].includes(pathname);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match('./index.html');
      if (cached) return cached;
      try { return await fetch(request); }
      catch { return cache.match('./index.html'); }
    })());
    return;
  }

  if (isShellUrl(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === 'CACHE_LATEST') {
    event.waitUntil((async () => {
      let ok = true;
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(APP_SHELL.map(async url => {
          try {
            const response = await fetch(new Request(url, { cache: 'reload' }));
            if (response && response.ok) await cache.put(url, response.clone());
          } catch (error) {
            ok = false;
          }
        }));
      } catch (error) {
        ok = false;
      }
      if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok });
    })());
  }
});
