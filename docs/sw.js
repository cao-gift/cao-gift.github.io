const CACHE_NAME = "gmeek-30dfe24a92c7";
const PRECACHE_URLS = ["/", "/fonts/lxgw-wenkai-screen-subset.css?v=20260717-1", "/fonts/lxgwwenkaiscreen-subset-118.woff2", "/img/avatar.webp", "/index.html", "/manifest.webmanifest", "/plugins/ArticleTOC.js", "/plugins/Theme.js?v=20260717-3", "/plugins/ThemeRuntime.js?v=20260717-3", "/plugins/lightbox.js", "/plugins/primer.css?v=20260717-1", "/post/18.html", "/post/20.html", "/post/35.html", "/post/36.html", "/post/4.html"];
const HOME_URL = "/";

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(PRECACHE_URLS.map(async url => {
      try {
        const response = await fetch(url, {cache: 'reload'});
        if (response.ok) await cache.put(url, response);
      } catch (error) {
        console.warn('[Gmeek PWA] precache failed:', url);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('gmeek-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (request.mode === 'navigate') {
      try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone());
        return response;
      } catch (error) {
        return cached || caches.match(HOME_URL);
      }
    }
    if (cached) {
      event.waitUntil(fetch(request).then(async response => {
        if (response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone());
      }).catch(() => undefined));
      return cached;
    }
    const response = await fetch(request);
    if (response.ok && ['script','style','font'].includes(request.destination)) {
      (await caches.open(CACHE_NAME)).put(request, response.clone());
    }
    return response;
  })());
});
