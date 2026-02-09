import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos - mais agressivo
      gcTime: 15 * 60 * 1000, // 15 minutos
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
      refetchOnMount: true,
      placeholderData: (previousData) => previousData,
      networkMode: 'online', // Melhor para detectar erros
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});
