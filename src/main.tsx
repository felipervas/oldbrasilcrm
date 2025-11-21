import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App.tsx";
import "./index.css";

// 🚀 Limpar service workers antigos e registrar novo
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      // Desregistrar TODOS os service workers antigos
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      
      // Registrar novo service worker com versão
      await navigator.serviceWorker.register('/sw.js?v=4');
      
      // Limpar todos os caches antigos
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      console.log('✅ Service worker atualizado e caches limpos');
    } catch (error) {
      console.warn('Erro ao atualizar service worker:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
