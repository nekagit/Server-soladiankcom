// Soladia Marketplace Service Worker
// Version 2.0.0

const CACHE_NAME = 'soladia-marketplace-v2.0.0';
const STATIC_CACHE = 'soladia-static-v2.0.0';
const DYNAMIC_CACHE = 'soladia-dynamic-v2.0.0';
const API_CACHE = 'soladia-api-v2.0.0';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/auth',
  '/products',
  '/categories',
  '/nft',
  '/wallet',
  '/seller/dashboard',
  '/admin/dashboard',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/health',
  '/api/solana/health',
  '/api/solana/wallet/info',
  '/api/solana/network/info'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE).then((cache) => {
        console.log('Service Worker: Caching API endpoints');
        return cache.addAll(API_ENDPOINTS);
      })
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== API_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(handleRequest(request));
});

// Handle different types of requests
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Static assets - cache first strategy
    if (isStaticAsset(url)) {
      return await cacheFirst(request, STATIC_CACHE);
    }
    
    // API requests - network first with cache fallback
    if (isAPIRequest(url)) {
      return await networkFirst(request, API_CACHE);
    }
    
    // Images - cache first with network fallback
    if (isImageRequest(url)) {
      return await cacheFirst(request, DYNAMIC_CACHE);
    }
    
    // HTML pages - network first with cache fallback
    if (isHTMLRequest(url)) {
      return await networkFirst(request, DYNAMIC_CACHE);
    }
    
    // Default - network first
    return await networkFirst(request, DYNAMIC_CACHE);
    
  } catch (error) {
    console.error('Service Worker: Fetch error:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return await caches.match('/offline.html') || 
             new Response('Offline - Please check your connection', {
               status: 503,
               statusText: 'Service Unavailable'
             });
    }
    
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache first strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Network first strategy
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Helper functions to identify request types
function isStaticAsset(url) {
  return url.pathname === '/' ||
         url.pathname.startsWith('/auth') ||
         url.pathname.startsWith('/products') ||
         url.pathname.startsWith('/categories') ||
         url.pathname.startsWith('/nft') ||
         url.pathname.startsWith('/wallet') ||
         url.pathname.startsWith('/seller') ||
         url.pathname.startsWith('/admin') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.woff2') ||
         url.pathname.endsWith('.woff') ||
         url.pathname.endsWith('.ttf');
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.pathname.startsWith('/backend/');
}

function isImageRequest(url) {
  return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i) ||
         url.hostname.includes('unsplash.com') ||
         url.hostname.includes('images.unsplash.com');
}

function isHTMLRequest(url) {
  return request.headers.get('accept')?.includes('text/html');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Handle background sync
async function doBackgroundSync() {
  try {
    // Sync offline transactions
    await syncOfflineTransactions();
    
    // Sync offline favorites
    await syncOfflineFavorites();
    
    // Sync offline cart
    await syncOfflineCart();
    
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Sync offline transactions
async function syncOfflineTransactions() {
  const offlineTransactions = await getOfflineData('offline-transactions');
  
  for (const transaction of offlineTransactions) {
    try {
      const response = await fetch('/api/solana/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction)
      });
      
      if (response.ok) {
        await removeOfflineData('offline-transactions', transaction.id);
        console.log('Service Worker: Synced transaction:', transaction.id);
      }
    } catch (error) {
      console.error('Service Worker: Failed to sync transaction:', error);
    }
  }
}

// Sync offline favorites
async function syncOfflineFavorites() {
  const offlineFavorites = await getOfflineData('offline-favorites');
  
  for (const favorite of offlineFavorites) {
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(favorite)
      });
      
      if (response.ok) {
        await removeOfflineData('offline-favorites', favorite.id);
        console.log('Service Worker: Synced favorite:', favorite.id);
      }
    } catch (error) {
      console.error('Service Worker: Failed to sync favorite:', error);
    }
  }
}

// Sync offline cart
async function syncOfflineCart() {
  const offlineCart = await getOfflineData('offline-cart');
  
  if (offlineCart.length > 0) {
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: offlineCart })
      });
      
      if (response.ok) {
        await clearOfflineData('offline-cart');
        console.log('Service Worker: Synced cart items');
      }
    } catch (error) {
      console.error('Service Worker: Failed to sync cart:', error);
    }
  }
}

// IndexedDB helper functions
async function getOfflineData(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SoladiaOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

async function removeOfflineData(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SoladiaOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

async function clearOfflineData(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SoladiaOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Soladia',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Soladia Marketplace', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic sync triggered');
  
  if (event.tag === 'content-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker: Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Unhandled promise rejection:', event.reason);
});

console.log('Service Worker: Loaded successfully');