/* Service worker: uvijek prvo s mreže (da odmah dobiješ najnoviju verziju igre),
   a kopiju čuva samo kao rezervu kad nema interneta. YouTube i Google API se ne diraju. */
const CACHE = "pogodi-pjesmu-v4";
const SHELL = ["./", "./index.html", "./data.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request.url, {cache: "no-cache", credentials: "same-origin"})   // zaobiđi HTTP keš, uvijek provjeri novu verziju
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./")))
  );
});
