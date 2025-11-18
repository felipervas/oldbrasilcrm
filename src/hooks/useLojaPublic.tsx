import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProdutosLoja = (filtros?: {
  marca?: string;
  marcas?: string[];
  categorias?: string[];
  busca?: string;
  destaque?: boolean;
  ordenacao?: string;
}) => {
  return useQuery({
    queryKey: ['produtos-loja-v2', filtros],
    queryFn: async () => {
      let query = supabase
        .from('produtos')
        .select(`
          id, nome, nome_loja, descricao, categoria,
          preco_base, preco_por_kg, peso_embalagem_kg, tipo_calculo, tipo_venda,
          visivel_loja, destaque_loja, rendimento_dose_gramas, preco_atualizado_em,
          marcas(id, nome, slug),
          produto_imagens(url, ordem, largura, altura, object_fit)
        `)
        .eq('ativo', true)
        .eq('visivel_loja', true);

      if (filtros?.marca) {
        query = query.eq('marca_id', filtros.marca);
      }

      if (filtros?.marcas && filtros.marcas.length > 0) {
        query = query.in('marca_id', filtros.marcas);
      }

      if (filtros?.categorias && filtros.categorias.length > 0) {
        query = query.in('categoria', filtros.categorias);
      }

      if (filtros?.busca) {
        query = query.ilike('nome', `%${filtros.busca}%`);
      }

      if (filtros?.destaque) {
        query = query.eq('destaque_loja', true);
      }

      // Ordenação
      const ordenacao = filtros?.ordenacao || 'ordem_exibicao';
      switch (ordenacao) {
        case 'menor_preco':
          query = query.order('preco_por_kg', { ascending: true, nullsFirst: false });
          break;
        case 'maior_preco':
          query = query.order('preco_por_kg', { ascending: false, nullsFirst: true });
          break;
        case 'a_z':
          query = query.order('nome', { ascending: true });
          break;
        case 'z_a':
          query = query.order('nome', { ascending: false });
          break;
        case 'lancamentos':
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('ordem_exibicao', { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // 🚀 OTIMIZAÇÃO: Buscar TODAS as tabelas em UMA query só (elimina N+1)
      const produtoIds = (data || []).map((p: any) => p.id);
      const { data: todasTabelas } = await supabase
        .from('produto_tabelas_preco')
        .select('produto_id, id, nome_tabela, preco_por_kg, unidade_medida')
        .in('produto_id', produtoIds)
        .eq('usar_no_site', true);

      // Criar map para lookup O(1)
      const tabelasMap = new Map(
        (todasTabelas || []).map((t: any) => [t.produto_id, t])
      );

      // Adicionar tabela aos produtos (sem await)
      const produtosComTabela = (data || []).map((produto: any) => ({
        ...produto,
        tabela_site: tabelasMap.get(produto.id),
        produto_imagens: (produto.produto_imagens || []).sort((a: any, b: any) => a.ordem - b.ordem)
      }));
      
      return produtosComTabela;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useProdutoDetalhes = (id: string) => {
  return useQuery({
    queryKey: ['produto-detalhes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          id, nome, nome_loja, descricao, categoria,
          preco_base, preco_por_kg, peso_embalagem_kg, tipo_calculo, tipo_venda,
          rendimento_dose_gramas, preco_atualizado_em,
          marcas(id, nome, site, slug),
          produto_imagens(url, ordem, largura, altura, object_fit)
        `)
        .eq('id', id)
        .eq('visivel_loja', true)
        .single();

      if (error) throw error;
      
      // Buscar a tabela com usar_no_site = true
      const { data: tabelaSite } = await supabase
        .from('produto_tabelas_preco')
        .select('id, nome_tabela, preco_por_kg, unidade_medida')
        .eq('produto_id', id)
        .eq('usar_no_site', true)
        .maybeSingle();
      
      // Ordenar imagens
      if (data.produto_imagens) {
        data.produto_imagens.sort((a: any, b: any) => a.ordem - b.ordem);
      }
      
      return {
        ...data,
        tabela_site: tabelaSite
      };
    },
  });
};

export const useProdutosRelacionados = (marcaId: string, produtoAtualId: string) => {
  return useQuery({
    queryKey: ['produtos-relacionados', marcaId, produtoAtualId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          id, nome, nome_loja, preco_por_kg, peso_embalagem_kg, rendimento_dose_gramas,
          tipo_venda, destaque_loja,
          marcas(nome, slug),
          produto_imagens(url, ordem, largura, altura, object_fit)
        `)
        .eq('marca_id', marcaId)
        .eq('ativo', true)
        .eq('visivel_loja', true)
        .neq('id', produtoAtualId)
        .limit(4);

      if (error) throw error;
      
      return (data || []).map(produto => ({
        ...produto,
        produto_imagens: (produto.produto_imagens || []).sort((a: any, b: any) => a.ordem - b.ordem)
      }));
    },
  });
};

export const useMarcasLoja = () => {
  return useQuery({
    queryKey: ['marcas-loja'],
    queryFn: async () => {
      // Buscar todas as marcas ativas
      const { data: marcas, error: marcasError } = await supabase
        .from('marcas')
        .select('id, nome, slug, descricao, site')
        .eq('ativa', true);

      if (marcasError) throw marcasError;

      // Para cada marca, contar produtos ativos e visíveis
      const marcasComContagem = await Promise.all(
        (marcas || []).map(async (marca) => {
          const { count } = await supabase
            .from('produtos')
            .select('id', { count: 'exact', head: true })
            .eq('marca_id', marca.id)
            .eq('ativo', true)
            .eq('visivel_loja', true);

          return {
            ...marca,
            produtos_count: count || 0
          };
        })
      );

      // Filtrar apenas marcas com produtos
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
