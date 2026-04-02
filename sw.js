// ── KS MOVIES SERVICE WORKER v1.0 ──
const CACHE_NAME = 'ks-movies-v1';
const STATIC_CACHE = 'ks-static-v1';

// Pages to cache immediately
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/user.html',
  '/login.html',
  '/onboarding.html',
  '/player.html',
  '/live.html',
  '/kspay.html',
  '/privacy.html',
  '/manifest.json',
  '/ks-tv.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ── INSTALL ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    })
  );
});

// ── ACTIVATE ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Network first, cache fallback ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET, external APIs, Firebase
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('firebaseio.com')) return;
  if (url.hostname.includes('firebasestorage')) return;
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('youtube.com')) return;
  if (url.hostname.includes('youtu.be')) return;
  if (url.hostname.includes('tmdb.org')) return;

  // HTML pages — Network first
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets — Cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});
