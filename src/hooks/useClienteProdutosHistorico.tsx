import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProdutoHistorico {
  produto_id: string;
  produto_nome: string;
  total_quantidade: number;
  primeira_compra: string;
  ultima_compra: string;
  dias_desde_ultima_compra: number;
  total_pedidos: number;
  status: 'parado' | 'risco' | 'ativo';
}

export const useClienteProdutosHistorico = (clienteId: string | null) => {
  return useQuery({
    queryKey: ['cliente-produtos-historico', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      
      const { data, error } = await supabase
        .rpc('get_cliente_produtos_historico', { cliente_uuid: clienteId });
      
      if (error) throw error;
      return (data || []) as ProdutoHistorico[];
    },
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};
