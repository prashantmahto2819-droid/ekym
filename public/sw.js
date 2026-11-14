/* Kalchuri One service worker — app-like loading and an offline page.
 * - Pages (navigations): network first; if offline, the last copy of that page, else /offline.html.
 * - Built files (/assets/*), icons, fonts: cache first (they have hashed names / rarely change).
 * - Supabase / API / POST requests are never touched.
 * Bump VERSION to drop old caches. */
const VERSION = "k1-v1";
const PAGES = `${VERSION}-pages`;
const STATIC = `${VERSION}-static`;
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE, "/pwa-192.png", "/pwa-512.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (!k.startsWith(VERSION)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const isStatic = (url) =>
  url.origin === self.location.origin && (url.pathname.startsWith("/assets/") || /\.(png|jpe?g|webp|svg|ico|woff2?)$/.test(url.pathname))
  || url.host === "fonts.gstatic.com" || url.host === "fonts.googleapis.com";

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate" && url.origin === self.location.origin) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok && !url.pathname.startsWith("/admin") && !url.pathname.startsWith("/auth")) {
          const c = await caches.open(PAGES);
          c.put(req, res.clone());
          // keep the page cache small
          const keys = await c.keys(); for (const k of keys.slice(0, Math.max(0, keys.length - 40))) await c.delete(k);
        }
        return res;
      } catch {
        return (await caches.match(req)) || (await caches.match(OFFLINE)) || new Response("offline", { status: 503 });
      }
    })());
    return;
  }

  if (isStatic(url)) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") (await caches.open(STATIC)).put(req, res.clone());
      return res;
    })());
  }
});
