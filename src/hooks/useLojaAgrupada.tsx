import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLojaAgrupada = () => {
  return useQuery({
    queryKey: ['loja-agrupada-v4'], // Nova versão com queries paralelas
    queryFn: async () => {
      // 🚀 QUERIES EM PARALELO: Produtos + Imagens ao mesmo tempo
      const [produtosResult, imagensResult] = await Promise.all([
        supabase
          .from('produtos')
          .select(`
            id, nome, nome_loja, descricao, categoria, 
            preco_por_kg, peso_embalagem_kg, rendimento_dose_gramas, tipo_calculo, tipo_venda,
            destaque_loja, ordem_exibicao,
            marca_id,
            marcas(id, nome, slug, descricao, site, imagem_banner, mostrar_texto_banner, banner_largura, banner_altura, banner_object_fit, banner_cor, logo_url)
          `)
          .eq('ativo', true)
          .eq('visivel_loja', true)
          .order('marca_id', { ascending: true, nullsFirst: false })
          .order('destaque_loja', { ascending: false })
          .order('ordem_exibicao', { ascending: true })
          .order('nome', { ascending: true }),
        
        // Buscar TODAS as imagens de ordem 0 em paralelo
        supabase
          .from('produto_imagens')
          .select('produto_id, url, largura, altura, object_fit')
          .eq('ordem', 0)
      ]);
      
      if (produtosResult.error) {
        console.error('❌ Erro ao buscar produtos:', produtosResult.error);
        throw produtosResult.error;
      }
      
      const produtos = produtosResult.data || [];
      
      if (produtos.length === 0) {
        return [];
      }

      // Criar map de imagens para lookup rápido
      const imagensMap = new Map(
        (imagensResult.data || []).map(img => [img.produto_id, img])
      );

      // 🚀 OTIMIZAÇÃO: Buscar TODAS as tabelas em UMA query só (elimina N+1)
      const todosProdutoIds = produtos.map(p => p.id);
      const { data: tabelasPreco } = await supabase
        .from('produto_tabelas_preco')
        .select('produto_id, id, nome_tabela, preco_por_kg, unidade_medida')
        .in('produto_id', todosProdutoIds)
        .eq('usar_no_site', true);

      const tabelasPrecoMap = new Map(
        (tabelasPreco || []).map(tabela => [tabela.produto_id, tabela])
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
            banner_largura: produto.marcas.banner_largura,
            banner_altura: produto.marcas.banner_altura,
            banner_object_fit: produto.marcas.banner_object_fit,
            banner_cor: produto.marcas.banner_cor,
            logo_url: produto.marcas.logo_url,
            produtos: [],
            primeiros5: []
          });
        }
        
        const marca = marcasMap.get(marcaId);
        
        const tabelaPreco = tabelasPrecoMap.get(produto.id);
        
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
          tipo_venda: produto.tipo_venda,
          destaque_loja: produto.destaque_loja,
          marcas: produto.marcas || { id: 'sem-marca', nome: 'Outros Produtos', slug: 'outros' },
          tabela_site: tabelaPreco || null,
          produto_imagens: [{
            url: imagensMap.get(produto.id)?.url || '/placeholder.svg',
            ordem: 0,
            largura: imagensMap.get(produto.id)?.largura,
            altura: imagensMap.get(produto.id)?.altura,
            object_fit: imagensMap.get(produto.id)?.object_fit
          }]
        };
        
        marca.produtos.push(produtoFormatado);
        
        // Adicionar aos primeiros 8 se ainda houver espaço
        if (marca.primeiros5.length < 8) {
          marca.primeiros5.push(produtoFormatado);
        }
      });
      
      // Converter para array e ordenar marcas
      const marcasArray = Array.from(marcasMap.values())
        .filter(m => m.produtos.length > 0)
        .sort((a, b) => {
          if (a.id === 'sem-marca') return 1;
          if (b.id === 'sem-marca') return -1;
          return a.nome.localeCompare(b.nome);
        });
      
      return marcasArray;
    },
    // ⚡ CACHE AGRESSIVO: 10 minutos (produtos mudam pouco)
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
