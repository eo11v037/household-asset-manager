const CACHE_NAME = 'household-asset-pwa-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// インストール時：基本シェルをキャッシュし、待機せず即座に有効化
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch(() => {
        // 一部取得失敗時もインストール自体は継続
      });
    })
  );
});

// アクティベート時：古いバージョンのキャッシュを全削除してクライアントを即制御
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey))
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ時：Network-First（更新反映を優先し、オフライン時のみキャッシュから返却）
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});