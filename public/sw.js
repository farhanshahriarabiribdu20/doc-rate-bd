// Minimal, safe service worker: lets the app open offline with the last seen rates.
//  - pages & rate data: network first, cached copy as fallback (so prices are never stale when online)
//  - static assets: cache first (their file names change on every build)
//  - admin / feedback API calls are never cached
const CACHE = 'fosholnexa-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') && url.pathname !== '/api/site-data') return;

  const networkFirst = async () => {
    try {
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch {
      const hit = await caches.match(req);
      return hit || (req.mode === 'navigate' ? caches.match('/') : Response.error());
    }
  };

  const cacheFirst = async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  };

  if (req.mode === 'navigate' || url.pathname === '/api/site-data') {
    event.respondWith(networkFirst());
  } else if (url.pathname.startsWith('/assets/') || /\.(png|jpg|svg|webmanifest)$/.test(url.pathname)) {
    event.respondWith(cacheFirst());
  }
});
