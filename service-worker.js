/* Deck of Many Brews service worker - stable rollback/network-first core */
const APP_VERSION = 'v142';
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
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async path => {
      try {
        const response = await fetch(new Request(path, { cache: 'reload' }));
        if (response && response.ok) await cache.put(path, response.clone());
      } catch (error) {
        // Do not fail install if the network is unavailable for one file.
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
    try { await cache.put(key, response.clone()); } catch (_) {}
  }
  return response;
}

async function networkFirst(request, cacheKey) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(new Request(request, { cache: 'reload' }));
    return putIfOk(cache, cacheKey || request, response);
  } catch (error) {
    const cached = await cache.match(cacheKey || request, { ignoreSearch: true }) || await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request, cacheKey) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(cacheKey || request, { ignoreSearch: true }) || await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  return putIfOk(cache, cacheKey || request, response);
}

async function offlineIndex() {
  const cache = await caches.open(CACHE_NAME);
  return await cache.match('./index.html') || await cache.match('./') || await cache.match('/index.html') || await cache.match('/') || null;
}

function coreKey(url) {
  const p = url.pathname;
  if (p === '/' || p.endsWith('/')) return './index.html';
  if (p.endsWith('/index.html')) return './index.html';
  if (p.endsWith('/app.css')) return './app.css';
  if (p.endsWith('/app.js')) return './app.js';
  if (p.endsWith('/manifest.webmanifest')) return './manifest.webmanifest';
  if (p.endsWith('/version.json')) return './version.json';
  return null;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !sameOrigin(request)) return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try { return await networkFirst(request, './index.html'); }
      catch (_) {
        const fallback = await offlineIndex();
        if (fallback) return fallback;
        return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deck of Many Brews Offline</title><body style="font-family:system-ui;background:#0e1018;color:#f4efe4;padding:2rem"><h1>Deck of Many Brews</h1><p>The app is offline and no cached copy is available yet. Reopen once while online.</p></body>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  const key = coreKey(url);
  if (key) {
    event.respondWith(networkFirst(request, key));
    return;
  }

  if (url.pathname.includes('/icons/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data && event.data.type === 'CACHE_LATEST') {
    event.waitUntil((async () => {
      let ok = true;
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(APP_SHELL.map(async path => {
          try {
            const response = await fetch(new Request(path, { cache: 'reload' }));
            if (response && response.ok) await cache.put(path, response.clone());
            else ok = false;
          } catch (_) { ok = false; }
        }));
      } catch (_) { ok = false; }
      if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok });
    })());
  }
});
