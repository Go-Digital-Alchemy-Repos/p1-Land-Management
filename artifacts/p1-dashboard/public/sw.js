const CACHE = "p1-shell-v1";
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch("/");
      if (!response.ok) throw new Error("Application shell unavailable");
      const html = await response.clone().text();
      await cache.put("/", response);
      const assets = [
        ...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g),
      ].map((m) => m[1]);
      await cache.addAll(["/icon.svg", "/icon-maskable.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/manifest.webmanifest", ...assets]);
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("p1-shell-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      ),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (event.request.mode === "navigate")
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
  else if (url.pathname.startsWith("/assets/") || ["/icon.svg", "/icon-maskable.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/manifest.webmanifest"].includes(url.pathname))
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const saved = await cache.match(event.request);
        if (saved) return saved;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      }),
    );
});
