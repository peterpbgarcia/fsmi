// sw.js
const SW_VERSION = '1.0.1';

console.log('Service Worker version:', SW_VERSION);

self.addEventListener('install', (event) => {
    console.log('Service Worker installing:', SW_VERSION);
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated:', SW_VERSION);

    event.waitUntil(
        self.clients.claim()
    );
});

self.addEventListener('fetch', (event) => {
    // No caching during testing.
    // Network requests go directly to the server.
});