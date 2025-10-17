import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMarcasLoja = () => {
  return useQuery({
    queryKey: ['marcas-loja'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marcas')
        .select(`
          id,
          nome,
          slug,
          descricao,
          site,
          ativa
        `)
        .eq('ativa', true);

      if (error) throw error;

      // Contar produtos visíveis por marca
      const marcasComContagem = await Promise.all(
        (data || []).map(async (marca) => {
          const { count } = await supabase
            .from('produtos')
            .select('id', { count: 'exact', head: true })
            .eq('marca_id', marca.id)
            .eq('ativo', true)
            .eq('visivel_loja', true);

          return {
            ...marca,
            produtos_count: count || 0,
          };
        })
      );

      return marcasComContagem.filter(m => m.produtos_count > 0);
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useMarcaDetalhes = (slug: string) => {
  return useQuery({
    queryKey: ['marca-detalhes', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marcas')
        .select('*')
        .eq('slug', slug)
        .eq('ativa', true)
        .single();

      if (error) throw error;
      return data;
    },
  });
};

export const useCategoriasLoja = () => {
  return useQuery({
    queryKey: ['categorias-loja'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('categoria')
        .eq('ativo', true)
        .eq('visivel_loja', true)
        .not('categoria', 'is', null);

      if (error) throw error;

      // Obter categorias únicas
      const categoriasUnicas = [...new Set((data || []).map(p => p.categoria))].filter(Boolean);
      return categoriasUnicas as string[];
    },
    staleTime: 10 * 60 * 1000,
  });
};
