import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutos - cache mais agressivo
      gcTime: 30 * 60 * 1000, // 30 minutos
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      refetchOnMount: false,
      // 🚀 Manter dados antigos enquanto carrega novos (melhor UX)
      placeholderData: (previousData) => previousData,
    },
  },
});
