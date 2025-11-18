// Service Worker para cache de imagens e assets estáticos
const CACHE_NAME = 'old-brasil-cache-v1';
const IMAGE_CACHE = 'images-cache-v1';

// Cache de imagens
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Cache apenas imagens
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            return response;
          }
          
          return fetch(request).then(fetchResponse => {
            // Cachear apenas respostas bem-sucedidas
            if (fetchResponse && fetchResponse.status === 200) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(() => {
            // Retornar placeholder em caso de erro
            return new Response('', { status: 404 });
          });
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
          .filter(name => name !== CACHE_NAME && name !== IMAGE_CACHE)
          .map(name => caches.delete(name))
      );
    })
  );
});
