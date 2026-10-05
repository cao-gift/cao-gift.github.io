const SHELL_CACHE_NAME = "gmeek-9862b46f8a34";
const RUNTIME_CACHE_NAME = SHELL_CACHE_NAME + '-runtime';
const CACHE_PREFIX = 'gmeek-';
const RUNTIME_CACHE_LIMIT = 60;
const PRECACHE_URLS = ["/", "/img/avatar.webp", "/index.html", "/manifest.webmanifest", "/plugins/Theme.min.js?v=20261005-2", "/plugins/ThemeRuntime.min.js?v=20261005-2", "/plugins/primer.css?v=20260717-1"];
const HOME_URL = "/";

async function trimRuntimeCache() {
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - RUNTIME_CACHE_LIMIT)).map(key => cache.delete(key)));
}

async function putRuntime(request, response) {
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  await cache.put(request, response);
  await trimRuntimeCache();
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE_NAME);
    await Promise.all(PRECACHE_URLS.map(async url => {
      try {
        const response = await fetch(url, {cache: 'reload'});
        if (response.ok) await cache.put(url, response);
      } catch (error) {
        console.warn('[Gmeek PWA] precache failed:', url);
      }
    }));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && ![SHELL_CACHE_NAME, RUNTIME_CACHE_NAME].includes(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const type = event.data && event.data.type;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (type === 'CLEAR_CACHES') {
    event.waitUntil((async () => {
      const names = await caches.keys();
      await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== SHELL_CACHE_NAME).map(name => caches.delete(name)));
      await self.skipWaiting();
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const runtime = await caches.open(RUNTIME_CACHE_NAME);
    const shell = await caches.open(SHELL_CACHE_NAME);
    const cached = await runtime.match(request) || await shell.match(request);
    if (request.mode === 'navigate' || ['script','style'].includes(request.destination) || url.pathname.endsWith('/postList.json')) {
      try {
        const response = await fetch(request, {cache: 'no-cache'});
        if (response.ok) event.waitUntil(putRuntime(request, response.clone()));
        return response;
      } catch (error) {
        if (cached) return cached;
        if (request.mode === 'navigate') return await shell.match(HOME_URL) || Response.error();
        return Response.error();
      }
    }
    if (cached) {
      event.waitUntil(fetch(request).then(async response => {
        if (response.ok && ['script','style','font'].includes(request.destination)) await putRuntime(request, response.clone());
      }).catch(() => undefined));
      return cached;
    }
    const response = await fetch(request);
    if (response.ok && ['script','style','font'].includes(request.destination)) {
      event.waitUntil(putRuntime(request, response.clone()));
    }
    return response;
  })());
});
