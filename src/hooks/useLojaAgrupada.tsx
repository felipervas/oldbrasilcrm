import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLojaAgrupada = () => {
  return useQuery({
    queryKey: ['loja-agrupada'],
    queryFn: async () => {
      // Buscar marcas ativas
      const { data: marcas } = await supabase
        .from('marcas')
        .select('*')
        .eq('ativa', true)
        .order('nome');
      
      // Para cada marca, buscar produtos e agrupar por linha
      const marcasComProdutos = await Promise.all(
        marcas?.map(async (marca) => {
          const { data: produtos } = await supabase
            .from('produtos')
            .select(`
              *,
              marcas (
                id,
                nome,
                slug
              ),
              produto_imagens (
                id,
                url,
                ordem
              )
            `)
            .eq('marca_id', marca.id)
            .eq('ativo', true)
            .eq('visivel_loja', true)
            .order('ordem_exibicao');
          
          // Ordenar imagens
          const produtosComImagens = produtos?.map(p => ({
            ...p,
            produto_imagens: p.produto_imagens?.sort((a: any, b: any) => a.ordem - b.ordem) || []
          })) || [];
          
          // Agrupar por subcategoria (linha)
          const linhas = produtosComImagens.reduce((acc, prod) => {
            const linha = prod.subcategoria || 'Geral';
            if (!acc[linha]) acc[linha] = [];
            acc[linha].push(prod);
            return acc;
          }, {} as Record<string, any[]>);
          
          // Se tem mais de uma linha definida, usar linhas
          // Senão, usar produtos direto
          const temLinhas = Object.keys(linhas).length > 1;
          
          return {
            ...marca,
            produtos: produtosComImagens,
            linhas: temLinhas ? linhas : null,
            primeiros5: temLinhas 
              ? Object.keys(linhas).slice(0, 5)
              : produtosComImagens.slice(0, 5)
          };
        }) || []
      );
      
      return marcasComProdutos;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
