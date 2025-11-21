import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos - mais agressivo
      gcTime: 15 * 60 * 1000, // 15 minutos
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Reconectar quando online novamente
      retry: 1, // 1 retry para falhas de rede
      refetchOnMount: false,
      placeholderData: (previousData) => previousData,
      networkMode: 'online', // Melhor para detectar erros
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});
