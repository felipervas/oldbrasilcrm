import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000, // 30 minutos - cache agressivo
      gcTime: 60 * 60 * 1000, // 1 hora
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 0, // Sem retry automático
      refetchOnMount: false,
      placeholderData: (previousData) => previousData,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});
