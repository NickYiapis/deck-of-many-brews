/* Deck of Many Brews service worker - v141 emergency loading recovery */
const APP_VERSION = 'v141';
const CACHE_PREFIX = 'homebrew-compendium-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;
const APP_SHELL = [
  './', './index.html', './app.css', './app.js', './manifest.webmanifest', './version.json', './icons/icon-192.png', './icons/icon-512.png'
];

async function deleteOldCaches() {
  const names = await caches.keys();
  await Promise.all(names.map(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME ? caches.delete(name) : Promise.resolve(false)));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await deleteOldCaches();
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async path => {
      try {
        const response = await fetch(new Request(path, { cache: 'reload' }));
        if (response && response.ok) await cache.put(path, response.clone());
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await deleteOldCaches();
    await self.clients.claim();
  })());
});

function sameOrigin(request) {
  try { return new URL(request.url).origin === self.location.origin; } catch (_) { return false; }
}
function normalizedKey(url) {
  const p = url.pathname.replace(/^\/+/, './');
  if (url.pathname === '/' || url.pathname.endsWith('/')) return './index.html';
  if (p === './index.html' || p === './app.css' || p === './app.js' || p === './manifest.webmanifest' || p === './version.json' || p === './icons/icon-192.png' || p === './icons/icon-512.png') return p;
  return null;
}
async function networkFirst(request, key) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(new Request(request, { cache: 'reload' }));
    if (response && response.ok && key) await cache.put(key, response.clone());
    return response;
  } catch (error) {
    const cached = key ? await cache.match(key, { ignoreSearch: true }) : await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const fallback = await cache.match('./index.html', { ignoreSearch: true }) || await cache.match('./', { ignoreSearch: true });
      if (fallback) return fallback;
      return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deck of Many Brews Recovery</title><body style="font-family:system-ui;background:#0e1018;color:#f4efe4;padding:2rem"><h1>Deck of Many Brews</h1><p>The app could not load. Reopen once while online.</p></body>', {headers:{'Content-Type':'text/html; charset=utf-8'}});
    }
    throw error;
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !sameOrigin(request)) return;
  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }
  const key = normalizedKey(url);
  if (key || url.pathname.endsWith('/version.json')) {
    event.respondWith(networkFirst(request, key || './version.json'));
    return;
  }
  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(request, {ignoreSearch:true}) || Response.error();
  }));
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
        await deleteOldCaches();
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(APP_SHELL.map(async path => {
          try {
            const response = await fetch(new Request(path, { cache: 'reload' }));
            if (response && response.ok) await cache.put(path, response.clone()); else ok = false;
          } catch (_) { ok = false; }
        }));
      } catch (_) { ok = false; }
      if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok });
    })());
  }
  if (event.data?.type === 'CLEAR_OLD_CACHES') {
    event.waitUntil(deleteOldCaches());
  }
});
