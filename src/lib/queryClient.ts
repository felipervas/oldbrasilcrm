import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos - otimizado para dados mais atualizados
      gcTime: 30 * 60 * 1000, // 30 minutos - cache agressivo
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      refetchOnMount: false, // Evita refetch desnecessário
    },
  },
});
