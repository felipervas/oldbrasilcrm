import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useGestorDashboard = () => {
  return useQuery({
    queryKey: ['gestor-dashboard'],
    queryFn: async () => {
      // Atualizar views materializadas para garantir dados frescos no dashboard
      await supabase.rpc('refresh_dashboard_views');

      // Usar views materializadas diretamente para performance
      const [faturamentoClientes, faturamentoMarcas, vendedores, pedidosRecentes, financeiro] = 
        await Promise.all([
          supabase.from('mv_faturamento_clientes').select('*').order('faturamento_total', { ascending: false }).limit(20),
          supabase.from('mv_faturamento_marcas').select('*').order('faturamento_total', { ascending: false }).limit(20),
          supabase.from('mv_performance_vendedores').select('*').order('faturamento_total', { ascending: false }).limit(20),
          supabase.from('pedidos')
            .select('id, numero_pedido, valor_total, data_pedido, status, cliente_id, responsavel_venda_id, clientes(nome_fantasia)')
            .order('data_pedido', { ascending: false })
            .limit(10),
          supabase.from('financeiro')
            .select('id, data, descricao, valor, tipo, status_pagamento, categoria, observacoes')
            .order('data', { ascending: true })
            .limit(100),
        ]);


      return {
        faturamentoClientes: faturamentoClientes.data || [],
        faturamentoMarcas: faturamentoMarcas.data || [],
        vendedores: vendedores.data || [],
        pedidosRecentes: pedidosRecentes.data || [],
        financeiro: financeiro.data || [],
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000,
  });
};
