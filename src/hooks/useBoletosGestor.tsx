import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useBoletosGestor = () => {
  return useQuery({
    queryKey: ['boletos-gestor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro')
        .select('*, clientes(nome_fantasia)')
        .eq('tipo', 'receita')
        .not('data_vencimento', 'is', null)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const boletos = data || [];
      const pendentes = boletos.filter(b => b.status_pagamento === 'pendente');
      
      const totalPendente = pendentes.reduce((sum, b) => sum + (Number(b.valor) || 0), 0);
      const vencidos = pendentes.filter(b => {
        const venc = new Date(b.data_vencimento);
        return venc < hoje;
      });
      const totalVencido = vencidos.reduce((sum, b) => sum + (Number(b.valor) || 0), 0);
      
      const proximos7Dias = pendentes.filter(b => {
        const venc = new Date(b.data_vencimento);
        const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
        return diff >= 0 && diff <= 7;
      });
      const totalProximos7Dias = proximos7Dias.reduce((sum, b) => sum + (Number(b.valor) || 0), 0);

      return {
        boletos,
        pendentes,
        totais: {
          pendente: totalPendente,
          vencido: totalVencido,
          proximos7Dias: totalProximos7Dias,
          qtdVencidos: vencidos.length,
          qtdProximos7Dias: proximos7Dias.length,
        }
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};