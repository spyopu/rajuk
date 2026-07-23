const CACHE_NAME = 'digital-khata-v4';
const assetsToCache = [
  '/rajuk/',
  '/rajuk/index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    })
  );
  self.skipWaiting();
});

// Activate Event
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

// Fetch Event (Network First, falling back to cache and index.html)
self.addEventListener('fetch', (event) => {
  // শুধুমাত্র GET রিকোয়েস্টগুলোর জন্য সার্ভিস ওয়ার্কার কাজ করবে
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // নেটওয়ার্ক থেকে সফলভাবে রেসপন্স পেলে সেটি রিটার্ন করুন
        return networkResponse;
      })
      .catch(() => {
        // ইন্টারনেট না থাকলে বা ফেইল করলে ক্যাশ থেকে খোঁজার চেষ্টা করুন
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // ক্যাশেও না পেলে সরাসরি মূল পেজ বা ইনডেক্স ফাইলে পাঠিয়ে দিন
          return caches.match('/rajuk/index.html');
        });
      })
  );
});
