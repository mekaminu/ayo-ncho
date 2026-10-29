// Offline play: cache the app shell, the engine and three.js so Play vs computer works with no signal.
const VERSION = 'ayo-v11';
const SHELL = ['./', './index.html', './game.js', './board.js', './physics.js', './textures.js', './characters.js', './quality.js', './streak.js', './clip.js', './online.js', './shouts.js', './ai-worker.js', './engine/ayo.js', './engine/ai.js', './manifest.webmanifest', './icon.svg', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('fonts.g')) return; // fonts: let the browser do its thing (the fallback stack is fine offline)
  // network first for our own files so updates arrive; cache for when there is no signal
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && (url.origin === location.origin || url.hostname === 'cdnjs.cloudflare.com')) caches.open(VERSION).then((c) => c.put(e.request, r.clone())); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((c) => c || caches.match('./index.html'))));
});
