import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProdutos = (page: number = 0, pageSize: number = 50, searchTerm: string = '') => {
  const start = page * pageSize;
  const end = start + pageSize - 1;

  return useQuery({
    queryKey: ['produtos', page, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('produtos')
        .select('id, nome, preco_base, preco_por_kg, peso_embalagem_kg, tipo_calculo, estoque_escritorio, ativo, marcas(nome, id)', { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('nome', `%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    staleTime: 15 * 60 * 1000, // 15 minutos - produtos mudam pouco
  });
};
