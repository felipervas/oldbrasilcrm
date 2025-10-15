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
        .select('id, nome_fantasia, cnpj_cpf, telefone, email, cidade, uf, ativo, responsavel_id, profiles(nome)', { count: 'exact' });

      // Filtro de status
      if (filtroStatus === 'ativo') {
        query = query.eq('ativo', true);
      } else if (filtroStatus === 'inativo') {
        query = query.eq('ativo', false);
      }

      // Busca por texto
      if (searchTerm) {
        query = query.or(`nome_fantasia.ilike.%${searchTerm}%,razao_social.ilike.%${searchTerm}%,cnpj_cpf.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    staleTime: 15 * 60 * 1000, // 15 minutos - clientes mudam pouco
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
  });
};
