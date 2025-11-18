import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePedidos = (page: number = 0, pageSize: number = 20, searchTerm: string = '') => {
  const start = page * pageSize;
  const end = start + pageSize - 1;

  return useQuery({
    queryKey: ['pedidos', page, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('pedidos')
        .select('*, clientes(nome_fantasia, responsavel_id, profiles(nome))', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`numero_pedido.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .order('data_pedido', { ascending: false })
        .range(start, end);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
