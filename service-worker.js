'use strict';

const RELEASE = 'v320';
const CACHE_PREFIX = 'deck-of-many-brews-';
const CACHE_NAME = `${CACHE_PREFIX}${RELEASE}`;
const CORE = Object.freeze([
  './index.html',
  './version.json',
  './manifest.webmanifest'
]);

async function cacheLatest() {
  const cache = await caches.open(CACHE_NAME);
  const results = await Promise.allSettled(CORE.map(async url => {
    const response = await fetch(new Request(url, { cache: 'reload' }));
    if (!response.ok) throw new Error(`Could not cache ${url}`);
    await cache.put(url, response.clone());
  }));
  return results.every(result => result.status === 'fulfilled');
}

self.addEventListener('install', event => {
  event.waitUntil(cacheLatest());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || (await cache.match('./index.html')) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' || /(?:index\.html|version\.json|manifest\.webmanifest)$/.test(url.pathname)) {
    event.respondWith(networkFirst(event.request));
  }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === 'CACHE_LATEST') {
    event.waitUntil(cacheLatest().then(ok => {
      event.ports?.[0]?.postMessage({ ok, version: RELEASE });
    }).catch(() => {
      event.ports?.[0]?.postMessage({ ok: false, version: RELEASE });
    }));
  }
});
