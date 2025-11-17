import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalClientes: number;
  tarefasPendentes: number;
  interacoesHoje: number;
  tarefasAtrasadas: number;
  amostrasEnviadas: number;
  totalProdutos: number;
  entregasPendentes: number;
}

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats_optimized');

      if (error) throw error;
      
      return data as unknown as DashboardStats;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false, // Não recarregar ao focar janela
  });
};

export const useDashboardEntregas = () => {
  return useQuery({
    queryKey: ['dashboard-entregas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero_pedido, data_previsao_entrega, status, clientes(nome_fantasia)')
        .not('data_previsao_entrega', 'is', null)
        .not('status', 'in', '(cancelado,entregue)')
        .order('data_previsao_entrega', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
