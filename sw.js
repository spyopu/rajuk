const CACHE_NAME = 'digital-khata-v5';
const assetsToCache = [
  '/rajuk/',
  '/rajuk/index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // যদি রিকোয়েস্টটি রুট বা rajuk ফোল্ডারের হয়, তবে সরাসরি index.html সার্ভ করবে
  if (url.pathname === '/rajuk' || url.pathname === '/rajuk/') {
    event.respondWith(caches.match('/rajuk/index.html'));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        return caches.match('/rajuk/index.html');
      });
    })
  );
});
