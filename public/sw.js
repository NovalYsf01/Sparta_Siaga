// SPARTA SIAGA Service Worker — Online-First Enterprise PWA
// Cache Versioning: Static assets only. Sensitive API & Operational data are STRICTLY EXCLUDED.

const CACHE_NAME = "sparta-siaga-static-v2";
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

// Activate Event: Clean up outdated caches immediately
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

  // 1. SECURITY & FRESHNESS FILTER:
  // Never cache API, auth, private documents, or Next.js internal build chunks (_next/)
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/storage/") ||
    url.pathname.startsWith("/_next/") ||
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

  // 3. Static Brand Assets & PWA Icons: Stale-While-Revalidate
  const isStaticBrandAsset =
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/") ||
    STATIC_ASSETS.includes(url.pathname);

  if (isStaticBrandAsset) {
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

// =========================================================================
// PWA REAL WEB PUSH NOTIFICATION HANDLERS
// =========================================================================
self.addEventListener("push", (event) => {
  let data = {
    title: "SPARTA SIAGA — Peringatan Bencana",
    body: "Terdapat pembaruan siaga bencana di unit operasional Anda.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    data: {
      url: "/",
    },
  };

  if (event.data) {
    try {
      const json = event.data.json();
      data = {
        title: json.title || data.title,
        body: json.body || json.message || data.body,
        icon: json.icon || data.icon,
        badge: json.badge || data.badge,
        tag: json.tag || "sparta-disaster-alert",
        eventId: json.eventId,
        disasterType: json.disasterType,
        ticketNumber: json.ticketNumber,
        branch: json.branch,
        data: {
          url: typeof json.url === "string" && json.url.startsWith("/") &&
            !json.url.startsWith("//") ? json.url : "/",
        },
      };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag || "sparta-siaga-alert",
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 400],
    data: data.data,
    actions: [
      { action: "open_app", title: "Buka Aplikasi" },
      { action: "dismiss", title: "Tutup" },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type: "SPARTA_PUSH_RECEIVED",
            data: {
              title: data.title,
              body: data.body,
              tag: options.tag,
              eventId: data.eventId,
              disasterType: data.disasterType,
              ticketNumber: data.ticketNumber,
              branch: data.branch,
              url: data.data?.url || "/",
              timestamp: new Date().toISOString(),
            },
          });
        }
      }),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const candidate = event.notification.data?.url || "/";
  let targetUrl;
  try {
    const parsed = new URL(candidate, self.location.origin);
    targetUrl = parsed.origin === self.location.origin ? parsed.href : self.location.origin + "/";
  } catch {
    targetUrl = self.location.origin + "/";
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

