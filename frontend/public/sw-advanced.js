/**
 * Advanced Service Worker for Soladia Marketplace
 * Provides comprehensive offline support, background sync, and push notifications
 */

const CACHE_NAME = 'soladia-v1.0.0';
const API_CACHE_NAME = 'soladia-api-v1.0.0';
const IMAGE_CACHE_NAME = 'soladia-images-v1.0.0';
const STATIC_CACHE_NAME = 'soladia-static-v1.0.0';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Cache configuration
const CACHE_CONFIG = {
  // Static assets - cache first
  static: {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: STATIC_CACHE_NAME,
    patterns: [
      /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|webp)$/,
      /\/_astro\//,
      /\/assets\//
    ]
  },
  // API requests - network first with cache fallback
  api: {
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: API_CACHE_NAME,
    patterns: [
      /\/api\//,
      /\/graphql/
    ]
  },
  // Images - cache first with network fallback
  images: {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: IMAGE_CACHE_NAME,
    patterns: [
      /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      /\/images\//,
      /\/api\/placeholder\//
    ]
  },
  // HTML pages - network first with cache fallback
  pages: {
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: CACHE_NAME,
    patterns: [
      /\.html$/,
      /\/$/,
      /\/[^.]*$/
    ]
  }
};

// Background sync queue
const SYNC_QUEUE = 'soladia-sync-queue';
const MAX_RETRY_ATTEMPTS = 3;

// Push notification configuration
const PUSH_NOTIFICATION_CONFIG = {
  title: 'Soladia Marketplace',
  icon: '/favicon.ico',
  badge: '/favicon.ico',
  vibrate: [200, 100, 200],
  requireInteraction: true
};

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        return cache.addAll([
          '/',
          '/offline.html',
          '/manifest.json',
          '/favicon.ico',
          '/favicon.svg'
        ]);
      }),
      // Cache API responses
      caches.open(API_CACHE_NAME).then(cache => {
        return cache.addAll([
          '/api/health',
          '/api/solana/health'
        ]);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!Object.values(CACHE_CONFIG).some(config => config.cacheName === cacheName)) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

/**
 * Fetch Event Handler
 */
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
  
  // Determine cache strategy
  const strategy = getCacheStrategy(request);
  
  if (strategy) {
    event.respondWith(handleRequest(request, strategy));
  }
});

/**
 * Background Sync Event Handler
 */
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === SYNC_QUEUE) {
    event.waitUntil(syncOfflineActions());
  }
});

/**
 * Push Event Handler
 */
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      ...PUSH_NOTIFICATION_CONFIG,
      ...data.options,
      data: data.data
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || PUSH_NOTIFICATION_CONFIG.title, options)
    );
  }
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Message Handler for Communication with Main Thread
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      cacheUrls(data.urls);
      break;
      
    case 'CLEAR_CACHE':
      clearCache(data.cacheName);
      break;
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
      
    case 'QUEUE_OFFLINE_ACTION':
      queueOfflineAction(data.action);
      break;
      
    default:
      console.log('Service Worker: Unknown message type:', type);
  }
});

/**
 * Handle Request with Cache Strategy
 */
async function handleRequest(request, strategy) {
  const { strategy: strategyType, cacheName } = strategy;
  
  try {
    switch (strategyType) {
      case CACHE_STRATEGIES.CACHE_FIRST:
        return await cacheFirst(request, cacheName);
        
      case CACHE_STRATEGIES.NETWORK_FIRST:
        return await networkFirst(request, cacheName);
        
      case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
        return await staleWhileRevalidate(request, cacheName);
        
      case CACHE_STRATEGIES.NETWORK_ONLY:
        return await networkOnly(request);
        
      case CACHE_STRATEGIES.CACHE_ONLY:
        return await cacheOnly(request, cacheName);
        
      default:
        return await networkFirst(request, cacheName);
    }
  } catch (error) {
    console.error('Service Worker: Error handling request:', error);
    return await getOfflineFallback(request);
  }
}

/**
 * Cache First Strategy
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return await getOfflineFallback(request);
  }
}

/**
 * Network First Strategy
 */
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
    return await getOfflineFallback(request);
  }
}

/**
 * Stale While Revalidate Strategy
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Update cache in background
  const networkResponsePromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network response
  try {
    return await networkResponsePromise;
  } catch (error) {
    return await getOfflineFallback(request);
  }
}

/**
 * Network Only Strategy
 */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return await getOfflineFallback(request);
  }
}

/**
 * Cache Only Strategy
 */
async function cacheOnly(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  return await getOfflineFallback(request);
}

/**
 * Get Offline Fallback
 */
async function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
  }
  
  // Return cached placeholder for images
  if (request.destination === 'image') {
    const placeholderResponse = await caches.match('/images/placeholder.svg');
    if (placeholderResponse) {
      return placeholderResponse;
    }
  }
  
  // Return generic offline response
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/plain'
    }
  });
}

/**
 * Determine Cache Strategy for Request
 */
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  for (const [type, config] of Object.entries(CACHE_CONFIG)) {
    if (config.patterns.some(pattern => pattern.test(url.pathname))) {
      return config;
    }
  }
  
  return null;
}

/**
 * Cache URLs
 */
async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    await cache.addAll(urls);
    console.log('Service Worker: Cached URLs:', urls);
  } catch (error) {
    console.error('Service Worker: Error caching URLs:', error);
  }
}

/**
 * Clear Cache
 */
async function clearCache(cacheName) {
  try {
    await caches.delete(cacheName);
    console.log('Service Worker: Cleared cache:', cacheName);
  } catch (error) {
    console.error('Service Worker: Error clearing cache:', error);
  }
}

/**
 * Get Cache Size
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

/**
 * Queue Offline Action
 */
async function queueOfflineAction(action) {
  try {
    const cache = await caches.open(SYNC_QUEUE);
    const id = Date.now().toString();
    const actionWithId = { ...action, id, timestamp: Date.now() };
    
    await cache.put(`action-${id}`, new Response(JSON.stringify(actionWithId)));
    console.log('Service Worker: Queued offline action:', actionWithId);
  } catch (error) {
    console.error('Service Worker: Error queuing offline action:', error);
  }
}

/**
 * Sync Offline Actions
 */
async function syncOfflineActions() {
  try {
    const cache = await caches.open(SYNC_QUEUE);
    const keys = await cache.keys();
    
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const action = await response.json();
        
        try {
          await processOfflineAction(action);
          await cache.delete(key);
          console.log('Service Worker: Synced offline action:', action.id);
        } catch (error) {
          console.error('Service Worker: Error syncing action:', action.id, error);
          
          // Retry logic
          if (action.retryCount < MAX_RETRY_ATTEMPTS) {
            action.retryCount = (action.retryCount || 0) + 1;
            await cache.put(key, new Response(JSON.stringify(action)));
          } else {
            await cache.delete(key);
            console.log('Service Worker: Max retries reached for action:', action.id);
          }
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Error syncing offline actions:', error);
  }
}

/**
 * Process Offline Action
 */
async function processOfflineAction(action) {
  const { type, data } = action;
  
  switch (type) {
    case 'CREATE_ORDER':
      return await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
    case 'UPDATE_PROFILE':
      return await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
    case 'ADD_TO_FAVORITES':
      return await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
    case 'SEND_MESSAGE':
      return await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

/**
 * Periodic Background Sync
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }
});

/**
 * Sync Content
 */
async function syncContent() {
  try {
    // Sync user data
    await syncUserData();
    
    // Sync marketplace data
    await syncMarketplaceData();
    
    // Sync notifications
    await syncNotifications();
    
    console.log('Service Worker: Content sync completed');
  } catch (error) {
    console.error('Service Worker: Error syncing content:', error);
  }
}

/**
 * Sync User Data
 */
async function syncUserData() {
  try {
    const response = await fetch('/api/user/sync');
    if (response.ok) {
      const data = await response.json();
      // Store user data in IndexedDB
      await storeUserData(data);
    }
  } catch (error) {
    console.error('Service Worker: Error syncing user data:', error);
  }
}

/**
 * Sync Marketplace Data
 */
async function syncMarketplaceData() {
  try {
    const response = await fetch('/api/marketplace/sync');
    if (response.ok) {
      const data = await response.json();
      // Store marketplace data in IndexedDB
      await storeMarketplaceData(data);
    }
  } catch (error) {
    console.error('Service Worker: Error syncing marketplace data:', error);
  }
}

/**
 * Sync Notifications
 */
async function syncNotifications() {
  try {
    const response = await fetch('/api/notifications/sync');
    if (response.ok) {
      const data = await response.json();
      // Store notifications in IndexedDB
      await storeNotifications(data);
    }
  } catch (error) {
    console.error('Service Worker: Error syncing notifications:', error);
  }
}

/**
 * Store User Data in IndexedDB
 */
async function storeUserData(data) {
  // Implementation for storing user data
  console.log('Service Worker: Storing user data:', data);
}

/**
 * Store Marketplace Data in IndexedDB
 */
async function storeMarketplaceData(data) {
  // Implementation for storing marketplace data
  console.log('Service Worker: Storing marketplace data:', data);
}

/**
 * Store Notifications in IndexedDB
 */
async function storeNotifications(data) {
  // Implementation for storing notifications
  console.log('Service Worker: Storing notifications:', data);
}

console.log('Service Worker: Advanced service worker loaded');


