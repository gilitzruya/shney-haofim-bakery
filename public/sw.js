// Basic service worker: makes the app installable as a PWA and shows a clear
// offline page instead of a blank screen when navigation fails with no network.
// Deliberately does not cache JS/CSS bundles — those are content-hashed per deploy,
// and caching them here risks serving a stale/broken build across releases.
const CACHE_NAME = "bakery-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(
      () => caches.match(OFFLINE_URL).then((response) => response ?? Response.error()),
    ),
  );
});
