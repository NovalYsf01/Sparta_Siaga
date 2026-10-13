// SPARTA SIAGA Service Worker — Online-First Enterprise PWA
// Cache Versioning: Static assets only. Sensitive API & Operational data are STRICTLY EXCLUDED.

const CACHE_NAME = "sparta-siaga-static-v1";
const STATIC_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/brand/building_logo.png",
  "/brand/alfamart_logo.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32x32.png",
  "/icons/favicon-16x16.png",
];

// Install Event: Pre-cache essential static shells and offline fallback
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Strict online-first routing
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. SECURITY FILTER: Never cache any API requests or authentication endpoints
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/storage/") ||
    url.pathname.includes("/evidence/") ||
    url.pathname.includes("/document/") ||
    url.pathname.includes("/export/") ||
    request.method !== "GET"
  ) {
    // Pass straight to network without service worker caching
    return;
  }

  // 2. Navigation Requests (HTML Pages): Network-First, with offline.html fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match("/offline.html").then((response) => {
          return response || new Response("Koneksi internet terputus.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        });
      })
    );
    return;
  }

  // 3. Static Assets (_next/static, public images/icons): Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    STATIC_ASSETS.includes(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Normal network request
  event.respondWith(fetch(request));
});
