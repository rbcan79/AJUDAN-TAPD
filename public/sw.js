// public/sw.js
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (event) => {
  // Dibutuhkan agar browser mendeteksi PWA yang valid
  event.respondWith(fetch(event.request));
});