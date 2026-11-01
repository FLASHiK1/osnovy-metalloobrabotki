/* Офлайн-режим: страницы и ресурсы сайта кладутся в кэш при первом визите.
   Страницы — «сначала сеть, потом кэш» (свежая версия, если есть интернет),
   остальное — «сначала кэш». При изменении файлов сайта увеличьте VERSION. */
const VERSION = "v2";
const CACHE = "osnovy-" + VERSION;
const PAGES = ["./", "index.html", "posadki.html", "razmernye-cepi.html", "sherokhovatost.html", "rezhimy-rezaniya.html",
  "rezby.html", "konusy.html", "gibka-lista.html", "rashod-elektrodov.html", "massa-metalla.html", "analogi-staley.html"];
const ASSETS = ["assets/site.css", "assets/site.js", "assets/early.js", "assets/favicon.svg", "assets/icon-192.png", "manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PAGES.concat(ASSETS))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("osnovy-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !isFont) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === "opaque") { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
