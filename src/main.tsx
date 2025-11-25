import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { queryClient } from "./lib/queryClient";
import App from "./App.tsx";
import "./index.css";

// 🚀 Apenas limpar service workers antigos e caches em produção (sem registrar novo SW)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      console.log('✅ Service workers removidos e caches limpos');
    } catch (error) {
      console.warn('Erro ao limpar service workers/caches:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </HelmetProvider>
);
