// Service Worker
// A versão é atualizada automaticamente pelo deploy.yml a cada push no GitHub Pages.
const CACHE_VERSION = '16.09.2026-1554';
const CACHE_NAME = `custo-pote-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  // Ignora métodos que não são GET (POST, PUT etc.) e esquemas não-http(s)
  // (chrome-extension://, moz-extension://, etc.) — cache só faz sentido pra GET http(s).
  if (req.method !== "GET" || !req.url.startsWith("http")) {
    return;
  }

  // Navegação (HTML): network-first, cai pro cache só se estiver offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => caches.match("index.html"))
    );
    return;
  }

  // Fontes do Google: cache-first com atualização em background (runtime caching).
  // Sem isso, offline quebra o visual (fontes não carregam).
  if (req.url.includes("fonts.googleapis.com") || req.url.includes("fonts.gstatic.com")) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            return networkRes;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Demais arquivos (mesmo domínio): cache-first com atualização em segundo plano.
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          const resClone = networkRes.clone();
          // Só guarda respostas válidas (status 200, same-origin ou CORS ok)
          if (networkRes && networkRes.status === 200 && networkRes.type !== "opaque") {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
