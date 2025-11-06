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
      const hoje = new Date().toISOString().split('T')[0];

      // Queries otimizadas apenas com contagens
      const [
        clientesRes,
        tarefasRes,
        interacoesRes,
        tarefasAtrasadasRes,
        amostrasRes,
        produtosRes,
        entregasRes,
      ] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('interacoes').select('id', { count: 'exact', head: true }).gte('data_hora', `${hoje}T00:00:00`),
        supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('status', 'pendente').lt('data_prevista', hoje),
        supabase.from('amostras').select('id', { count: 'exact', head: true }),
        supabase.from('produtos').select('id', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('pedidos').select('id', { count: 'exact', head: true }).not('data_previsao_entrega', 'is', null).not('status', 'in', '(cancelado,entregue)'),
      ]);

      const stats: DashboardStats = {
        totalClientes: clientesRes.count || 0,
        tarefasPendentes: tarefasRes.count || 0,
        interacoesHoje: interacoesRes.count || 0,
        tarefasAtrasadas: tarefasAtrasadasRes.count || 0,
        amostrasEnviadas: amostrasRes.count || 0,
        totalProdutos: produtosRes.count || 0,
        entregasPendentes: entregasRes.count || 0,
      };

      return stats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
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
