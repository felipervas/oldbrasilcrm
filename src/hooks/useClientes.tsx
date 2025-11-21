import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useClientes = (page: number = 0, pageSize: number = 50, searchTerm: string = '', filtroStatus: string = 'todos') => {
  const start = page * pageSize;
  const end = start + pageSize - 1;

  return useQuery({
    queryKey: ['clientes', page, searchTerm, filtroStatus],
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        .select('id, nome_fantasia, razao_social, cnpj_cpf, telefone, email, cidade, uf, ativo, total_comprado, compra_mensal_media, ultima_compra_data, total_pedidos, responsavel_id, created_at, profiles(nome)', { count: 'exact' });

      // Filtro de status
      if (filtroStatus === 'ativo') {
        query = query.eq('ativo', true);
      } else if (filtroStatus === 'inativo') {
        query = query.eq('ativo', false);
      }

      // Busca otimizada - usar índices
      if (searchTerm) {
        const term = searchTerm.trim();
        query = query.or(`nome_fantasia.ilike.%${term}%,razao_social.ilike.%${term}%,cnpj_cpf.ilike.%${term}%,telefone.ilike.%${term}%`);
      }

      const { data, error, count } = await query
        .order('nome_fantasia', { ascending: true })
        .range(start, end);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000,
  });
};

export const useClienteCompleto = (clienteId: string | null) => {
  return useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: async () => {
      if (!clienteId) return null;
      
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
