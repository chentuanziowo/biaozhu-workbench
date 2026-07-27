const CACHE = 'annotator-workbench-v14';
const ASSETS = [
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  // 页面 HTML 始终走网络（不缓存），避免沙箱休眠时返回旧版、导致（如去重前）数据异常；
  // 离线时直接失败，由平台提示「工作空间已停止」，绝不展示陈旧的错误页面。
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(fetch(req));
    return;
  }
  // 其余静态资源（图标 / 清单）：缓存优先、离线可用，保证「添加到主屏幕」后图标与清单仍在
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return resp;
    }))
  );
});
