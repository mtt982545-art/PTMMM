// Minimal no-op Service Worker (opsi B)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());

// Optional: handle messages for unregister flow
self.addEventListener("message", (event) => {
  if (event?.data?.type === "FORCE_UNREGISTER") {
    // no-op: place holder to acknowledge message
  }
});

const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9oO2KqQAAAAASUVORK5CYII=";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(
      fetch(event.request).then((r) => {
        if (!r.ok && r.status === 404) {
          const bytes = Uint8Array.from(atob(PNG_BASE64), (c) => c.charCodeAt(0));
          return new Response(bytes, {
            status: 200,
            headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
          });
        }
        return r;
      }).catch(() => {
        const bytes = Uint8Array.from(atob(PNG_BASE64), (c) => c.charCodeAt(0));
        return new Response(bytes, {
          status: 200,
          headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
        });
      })
    );
  }
});
