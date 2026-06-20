/* Deck of Many Brews service worker - safe refresh/offline cache */
const APP_VERSION = 'v138';
const CACHE_PREFIX = 'homebrew-compendium-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/app.css',
  '/app.js',
  '/manifest.webmanifest',
  '/version.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async path => {
      try {
        const response = await fetch(new Request(path, { cache: 'reload' }));
        if (response && response.ok) await cache.put(path, response.clone());
      } catch (error) {
        // Do not fail installation because one optional shell file could not be cached.
        console.warn('[Deck of Many Brews] Cache warmup skipped:', path, error);
      }
    }));
    await self.skipWaiting();
  })());
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

function sameOrigin(request) {
  try { return new URL(request.url).origin === self.location.origin; }
  catch { return false; }
}

async function putIfOk(cache, key, response) {
  if (response && response.ok) {
    try { await cache.put(key, response.clone()); } catch {}
  }
  return response;
}

async function cachedIndex(cache) {
  return (
    await cache.match('/index.html') ||
    await cache.match('/') ||
    await cache.match('./index.html') ||
    await cache.match('./') ||
    null
  );
}

async function navigationHandler(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put('/index.html', response.clone());
      return response;
    }
  } catch (error) {
    // Fall through to offline cache.
  }

  const fallback = await cachedIndex(cache);
  if (fallback) return fallback;

  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deck of Many Brews Offline</title></head><body style="font-family:system-ui;background:#0e1018;color:#f4efe4;padding:2rem"><h1>Deck of Many Brews</h1><p>The app could not load from the network and no offline copy is cached yet. Reopen it once while online.</p></body></html>`, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function networkFirst(request, cacheKey = request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    return putIfOk(cache, cacheKey, response);
  } catch (error) {
    const cached = await cache.match(cacheKey, { ignoreSearch: true }) || await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}


async function cacheFirst(request, cacheKey = request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(cacheKey, { ignoreSearch: true }) || await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  return putIfOk(cache, cacheKey, response);
}

async function staleWhileRevalidate(request, cacheKey = request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(cacheKey, { ignoreSearch: true }) || await cache.match(request, { ignoreSearch: true });
  const fetchPromise = fetch(request)
    .then(response => putIfOk(cache, cacheKey, response))
    .catch(() => null);
  return cached || fetchPromise || fetch(request);
}

function shellCacheKey(url) {
  const pathname = url.pathname;
  if (pathname === '/' || pathname.endsWith('/')) return '/index.html';
  const shell = APP_SHELL.find(path => pathname === path);
  return shell || null;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !sameOrigin(request)) return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(networkFirst(request, '/version.json'));
    return;
  }

  const shellKey = shellCacheKey(url);
  if (shellKey) {
    event.respondWith(cacheFirst(request, shellKey));
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
        await Promise.all(APP_SHELL.map(async path => {
          try {
            const response = await fetch(new Request(path, { cache: 'reload' }));
            if (response && response.ok) await cache.put(path, response.clone());
            else ok = false;
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
