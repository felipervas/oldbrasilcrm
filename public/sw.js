// Service Worker minimalista - versão 4
// Remove cache agressivo que causava problemas no Safari

const CACHE_VERSION = 'v4';

// Limpar TODOS os caches antigos na ativação
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    }).then(() => {
      // Tomar controle imediatamente de todas as páginas
      return self.clients.claim();
    })
  );
});

// Não interceptar nenhuma requisição - deixar o navegador lidar naturalmente
self.addEventListener('fetch', () => {
  // Intencionalmente vazio - não interceptamos requisições
});
