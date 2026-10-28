/* Alchemydoku service worker.
 * The version and precache list below are filled in at build time by the
 * `alchemydoku-sw` plugin in vite.config.ts. In `npm run dev` they stay
 * as placeholders and the worker is never registered. */
const VERSION = '__VERSION__';
const PRECACHE = '__PRECACHE__';
const CACHE = `alchemydoku-${VERSION}`;
const SCOPE = self.registration.scope; // e.g. https://host/alchemydoku/
const SCOPE_PATH = new URL(SCOPE).pathname;

const urlsToCache = () => {
  try { return JSON.parse(PRECACHE).map((p) => new URL(p, SCOPE).href); }
  catch { return [SCOPE]; }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(urlsToCache())).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('alchemydoku-') && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // analytics, Google APIs, etc.
  if (url.pathname.startsWith(SCOPE_PATH + 'preview/')) return; // /preview/ has its own worker

  // Page loads: network first (fresh deploys), fall back to the cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SCOPE, copy));
          return res;
        })
        .catch(() => caches.match(SCOPE).then((r) => r || caches.match(SCOPE + 'index.html')))
    );
    return;
  }

  // Everything else: cache first, then network (and remember it).
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
