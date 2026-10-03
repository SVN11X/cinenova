/* Actualizar VERSION al publicar una nueva versión del frontend. */
const VERSION = "cinenova-static-v4-ux";
const ASSETS = ["./", "./index.html", "./styles.css?v=4", "./app.js?v=4", "./config.js?v=4", "./manifest.json", "./icon.png"];
const SCOPE = new URL("./", self.location.href);
const ASSET_PATHS = new Set(ASSETS.map((path) => new URL(path, SCOPE).pathname));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  // Se conservan las cachés de otras aplicaciones en el mismo origen.
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("cinenova-") && key !== VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  if (request.mode !== "navigate" && !ASSET_PATHS.has(url.pathname)) return;
  // Solo archivos propios: el catálogo, las imágenes y el video usan la red.
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") await cache.put(request, response.clone());
      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") return await cache.match(new URL("./index.html", SCOPE)) || Response.error();
      return Response.error();
    }
  })());
});
