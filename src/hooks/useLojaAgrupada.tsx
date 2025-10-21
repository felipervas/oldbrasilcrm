import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLojaAgrupada = () => {
  return useQuery({
    queryKey: ['loja-agrupada-v2'],
    queryFn: async () => {
      // 🚀 QUERY SUPER OTIMIZADA: Buscar apenas primeiras imagens + informações essenciais
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select(`
          id, nome, nome_loja, descricao, categoria, 
          preco_por_kg, peso_embalagem_kg, rendimento_dose_gramas, tipo_calculo,
          destaque_loja, ordem_exibicao,
          marca_id,
          marcas(id, nome, slug, descricao, site, imagem_banner, mostrar_texto_banner)
        `)
        .eq('ativo', true)
        .eq('visivel_loja', true)
        .order('marca_id', { ascending: true, nullsFirst: false })
        .order('destaque_loja', { ascending: false })
        .order('ordem_exibicao', { ascending: true })
        .order('nome', { ascending: true });
      
      if (error) {
        console.error('❌ Erro ao buscar produtos:', error);
        throw error;
      }
      
      if (!produtos || produtos.length === 0) {
        return [];
      }

      // Buscar APENAS as primeiras imagens de cada produto (muito mais rápido!)
      const produtoIds = produtos.map(p => p.id);
      const { data: imagens } = await supabase
        .from('produto_imagens')
        .select('produto_id, url')
        .in('produto_id', produtoIds)
        .eq('ordem', 0);

      // Criar map de imagens para lookup rápido
      const imagensMap = new Map(
        (imagens || []).map(img => [img.produto_id, img.url])
      );
      
      // Agrupar por marca (incluindo produtos sem marca)
      const marcasMap = new Map();
      
      // Criar grupo para produtos sem marca
      marcasMap.set('sem-marca', {
        id: 'sem-marca',
        nome: 'Outros Produtos',
        slug: 'outros',
        descricao: 'Produtos diversos',
        site: null,
        imagem_banner: null,
        mostrar_texto_banner: true,
        produtos: [],
        primeiros5: []
      });
      
      produtos.forEach((produto: any) => {
        const marcaId = produto.marca_id || 'sem-marca';
        
        // Criar entrada da marca se não existir
        if (!marcasMap.has(marcaId) && produto.marcas) {
          marcasMap.set(marcaId, {
            id: produto.marcas.id,
            nome: produto.marcas.nome,
            slug: produto.marcas.slug,
            descricao: produto.marcas.descricao,
            site: produto.marcas.site,
            imagem_banner: produto.marcas.imagem_banner,
            mostrar_texto_banner: produto.marcas.mostrar_texto_banner,
            produtos: [],
            primeiros5: []
          });
        }
        
        const marca = marcasMap.get(marcaId);
        
        const produtoFormatado = {
          id: produto.id,
          nome: produto.nome_loja || produto.nome,
          nome_loja: produto.nome_loja,
          descricao: produto.descricao,
          categoria: produto.categoria,
          preco_por_kg: produto.preco_por_kg,
          peso_embalagem_kg: produto.peso_embalagem_kg,
          rendimento_dose_gramas: produto.rendimento_dose_gramas,
          tipo_calculo: produto.tipo_calculo,
          destaque_loja: produto.destaque_loja,
          marcas: produto.marcas || { id: 'sem-marca', nome: 'Outros Produtos', slug: 'outros' },
          produto_imagens: [{
            url: imagensMap.get(produto.id) || '/placeholder.svg',
            ordem: 0
          }]
        };
        
        marca.produtos.push(produtoFormatado);
        
        // Adicionar aos primeiros 5 se ainda houver espaço
        if (marca.primeiros5.length < 8) {
          marca.primeiros5.push(produtoFormatado);
        }
      });
      
      // Converter para array e ordenar marcas
      const marcasArray = Array.from(marcasMap.values())
        .filter(m => m.produtos.length > 0)
        .sort((a, b) => {
          // "Outros Produtos" vai para o final
          if (a.id === 'sem-marca') return 1;
          if (b.id === 'sem-marca') return -1;
          return a.nome.localeCompare(b.nome);
        });
      
      return marcasArray;
    },
    // ⚡ CACHE: 5 minutos (produtos mudam pouco)
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
