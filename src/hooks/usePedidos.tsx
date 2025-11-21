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
        .select('id, numero_pedido, data_pedido, valor_total, status, cliente_id, responsavel_venda_id, clientes(nome_fantasia)', { count: 'exact' });

      if (searchTerm) {
        const term = searchTerm.trim();
        query = query.ilike('numero_pedido', `%${term}%`);
      }

      const { data, error, count } = await query
        .order('data_pedido', { ascending: false })
        .range(start, end);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
