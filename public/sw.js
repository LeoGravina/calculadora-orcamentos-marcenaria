/* Service Worker - MV Móveis
   App shell offline (instalável). Os dados do Firebase usam a
   persistência offline do Firestore, então passam direto pela rede. */
const CACHE = 'mvmoveis-cache-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/minha-logo.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL).catch(() => {}))
  );
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
  // Requisições externas (Firebase/Google APIs) seguem direto pela rede
  if (url.origin !== self.location.origin) return;

  // Navegação (SPA): tenta a rede, cai pro index.html em cache quando offline
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }

  // Demais assets do próprio domínio: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
