import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useGestorDashboard = () => {
  return useQuery({
    queryKey: ['gestor-dashboard'],
    queryFn: async () => {
      // Usar funções otimizadas e seguras para acessar dados
      const [faturamentoClientes, faturamentoMarcas, vendedores, pedidosRecentes, financeiro] = 
        await Promise.all([
          supabase.rpc('get_faturamento_clientes').limit(20),
          supabase.rpc('get_faturamento_marcas').limit(20),
          supabase.rpc('get_performance_vendedores').limit(20),
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
