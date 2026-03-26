const CACHE = 'jarvis-v1';
const ASSETS = [
  './index.html',
  './social.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&family=Share+Tech+Mono&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(ASSETS.map(url =>
        cache.add(url).catch(() => {})
      ));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Always try network first for API calls
  if (e.request.url.includes('anthropic.com') ||
      e.request.url.includes('googleapis.com/css')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache first for app assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

// Background sync for Monday report scheduling
self.addEventListener('periodicsync', e => {
  if (e.tag === 'monday-report') {
    e.waitUntil(triggerMondayReport());
  }
});

async function triggerMondayReport() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'MONDAY_REPORT' }));
}
