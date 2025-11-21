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
        .select('id, nome, nome_loja, categoria, subcategoria, submarca, descricao, preco_por_kg, preco_base, peso_embalagem_kg, rendimento_dose_gramas, ativo, visivel_loja, destaque_loja, estoque_escritorio, marca_id, marcas(nome, id)', { count: 'exact' });

      if (searchTerm) {
        const term = searchTerm.trim();
        query = query.ilike('nome', `%${term}%`);
      }

      const { data, error, count } = await query
        .order('nome', { ascending: true })
        .range(start, end);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};
