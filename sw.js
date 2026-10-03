// جارویس — Service Worker: برنامه و کتابخانه‌ها را کش می‌کند تا بدون اینترنت باز شود.
// (وزن مدل‌ها را خود کتابخانه‌ها در Cache Storage نگه می‌دارند؛ اینجا دخالت نمی‌کنیم.)
const VER = "jarvis-offline-v2";
const CDN_CACHE = VER + "-cdn";
const SHELL = [
  "./",
  "./index.html",
  "./asr-worker.js",
  "./llm-worker.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
];
const CDN_HOSTS = ["cdn.jsdelivr.net", "esm.run", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VER).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("jarvis-offline") && k !== VER && k !== CDN_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // کتابخانه‌ها و فونت‌ها: اول کش
  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(CDN_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // فایل‌های خود برنامه: کش اول، در پس‌زمینه به‌روز می‌شود
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(VER);
      const hit = await cache.match(req);
      const net = fetch(req)
        .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => null);
      if (hit) return hit;
      const res = await net;
      if (res) return res;
      if (req.mode === "navigate") {
        const shell = await cache.match("./index.html");
        if (shell) return shell;
      }
      return Response.error();
    })());
  }
  // بقیه‌ی منبع‌ها (مثل huggingface و github) را به حال خودشان می‌گذاریم؛ خود کتابخانه‌ها کش‌شان می‌کنند
});
