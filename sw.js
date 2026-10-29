// アプリ本体は先に保存し、地図タイルは見た分だけ保存して圏外でも表示できるようにする
const VERSION = 'v1';
const APP = `app-${VERSION}`;
const TILES = 'tiles';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'icons/apple-touch-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== APP && k !== TILES).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname === 'cyberjapandata.gsi.go.jp' || url.hostname.endsWith('gstatic.com') || url.hostname === 'fonts.googleapis.com') {
    // タイルとフォント: 保存済みを優先し、なければ取りに行って保存
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok || res.type === 'opaque') c.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  // アプリ本体: ネットにつながれば最新を取り、圏外なら保存済みを使う
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok && url.origin === location.origin) {
      const copy = res.clone();
      caches.open(APP).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
