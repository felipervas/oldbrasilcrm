// Service Worker para cache agressivo de imagens e API
const CACHE_NAME = 'old-brasil-cache-v2';
const IMAGE_CACHE = 'images-cache-v2';
const API_CACHE = 'api-cache-v2';

// Cache de imagens
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Cache imagens
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(request).then(response => {
          if (response) return response;
          
          return fetch(request).then(fetchResponse => {
            if (fetchResponse && fetchResponse.status === 200) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(() => new Response('', { status: 404 }));
        });
      })
    );
  }
  
  // Cache de leitura da API (GET apenas) - cache agressivo
  if (request.method === 'GET' && url.hostname.includes('supabase.co')) {
    // Não cachear auth endpoints
    if (url.pathname.includes('/auth/')) return;
    
    event.respondWith(
      caches.open(API_CACHE).then(cache => {
        return cache.match(request).then(cachedResponse => {
          // Retornar cache primeiro, buscar em background
          const fetchPromise = fetch(request).then(fetchResponse => {
            if (fetchResponse && fetchResponse.status === 200) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(() => cachedResponse);
          
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});

// Limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => 
            name !== CACHE_NAME && 
            name !== IMAGE_CACHE && 
            name !== API_CACHE
          )
          .map(name => caches.delete(name))
      );
    })
  );
});
