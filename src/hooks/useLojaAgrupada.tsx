import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLojaAgrupada = () => {
  return useQuery({
    queryKey: ['loja-agrupada'],
    queryFn: async () => {
      // 🚀 QUERY OTIMIZADA: 1 única chamada para buscar tudo
      // Reduz de ~10-15 queries para apenas 1 query SQL otimizada
      const { data, error } = await supabase
        .rpc('get_loja_home_otimizada', { limite_produtos_por_marca: 5 });
      
      if (error) {
        console.error('❌ Erro ao buscar dados da loja:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Agrupar resultados por marca
      const marcasMap = new Map();
      
      data.forEach((row: any) => {
        if (!marcasMap.has(row.marca_id)) {
          marcasMap.set(row.marca_id, {
            id: row.marca_id,
            nome: row.marca_nome,
            slug: row.marca_slug,
            descricao: row.marca_descricao,
            site: row.marca_site,
            imagem_banner: row.marca_imagem_banner,
            mostrar_texto_banner: row.marca_mostrar_texto_banner,
            ativa: row.marca_ativa,
            created_at: row.marca_created_at,
            updated_at: row.marca_updated_at,
            produtos: [],
            primeiros5: []
          });
        }
        
        const marca = marcasMap.get(row.marca_id);
        
        // Adicionar produto com sua imagem principal já incluída
        if (row.produto_id) {
          const produto = {
            id: row.produto_id,
            nome: row.produto_nome,
            nome_loja: row.produto_nome_loja,
            sku: row.produto_sku,
            descricao: row.produto_descricao,
            categoria: row.produto_categoria,
            subcategoria: row.produto_subcategoria,
            preco_por_kg: row.produto_preco_por_kg,
            peso_embalagem_kg: row.produto_peso_embalagem_kg,
            rendimento_dose_gramas: row.produto_rendimento_dose_gramas,
            tipo_calculo: row.produto_tipo_calculo,
            destaque_loja: row.produto_destaque_loja,
            ordem_exibicao: row.produto_ordem_exibicao,
            ativo: row.produto_ativo,
            visivel_loja: row.produto_visivel_loja,
            marcas: {
              id: row.marca_id,
              nome: row.marca_nome,
              slug: row.marca_slug
            },
            produto_imagens: [{
              url: row.imagem_url,
              ordem: row.imagem_ordem
            }]
          };
          
          marca.produtos.push(produto);
          
          // Primeiros 5 já limitados pela query SQL
          if (marca.primeiros5.length < 5) {
            marca.primeiros5.push(produto);
          }
        }
      });
      
      return Array.from(marcasMap.values());
    },
    // ⚡ CACHE OTIMIZADO: Dados da loja mudam pouco, cache mais longo
    staleTime: 15 * 60 * 1000, // 15 minutos (produtos mudam raramente)
    gcTime: 60 * 60 * 1000, // 60 minutos (manter em memória por mais tempo)
  });
};
