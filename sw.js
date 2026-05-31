const CACHE_NAME = "cinenova-static-v2";
const STATIC_ASSETS = ["./", "./index.html", "./manifest.json", "./icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isTMDB = url.hostname.includes("themoviedb.org") || url.hostname.includes("tmdb.org");
  const isImageCDN = url.hostname.includes("image.tmdb.org") || url.hostname.includes("dicebear.com");
  const isExternalPlayer = url.hostname.includes("streamimdb.ru") || url.hostname.includes("playimdb.com");

  if (isExternalPlayer || isTMDB || isImageCDN) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
