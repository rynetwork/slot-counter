/* 小役カウンター オフライン用 Service Worker
   - 一度開いたらページをiPhone内に保存し、圏外でも起動できるようにする
   - 通信できるときは裏で最新版を取得し、次回起動時に反映する
   index.html を更新したときは、下の VERSION の数字も1つ上げるとより確実に反映されます */
const VERSION = 'v1';
const CACHE = 'slot-counter-' + VERSION;
const FILES = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('slot-counter-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      // 裏で最新版を取りに行く（圏外なら何もしない）
      const update = fetch(req)
        .then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => null);
      // 保存済みがあれば即表示、なければ通信結果を使う
      return cached || (await update) || new Response('オフラインです', { status: 503 });
    })
  );
});
