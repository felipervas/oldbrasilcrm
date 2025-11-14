import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Tipos para as views de análise
export interface AnalisePerda {
  motivo_perda: string;
  total_perdas: number;
  percentual: number;
}

export interface PerdaPorVendedor {
  vendedor_id: string;
  vendedor_nome: string;
  total_perdidos: number;
  total_ganhos: number;
  total_prospects: number;
  taxa_conversao: number;
}

export interface PerformanceVendedor {
  vendedor_id: string;
  vendedor_nome: string;
  faturamento_total: number;
  total_pedidos: number;
  ticket_medio: number;
  prospects_convertidos: number;
  total_prospects: number;
  taxa_conversao: number;
  tarefas_concluidas: number;
  total_tarefas: number;
  tempo_primeira_resposta_horas: number;
}

export const useAnalisePerda = () => {
  return useQuery<AnalisePerda[]>({
    queryKey: ['analise-perda'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_analise_perda' as any)
        .select('*');

      if (error) throw error;
      return (data || []) as unknown as AnalisePerda[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const usePerdaPorVendedor = () => {
  return useQuery<PerdaPorVendedor[]>({
    queryKey: ['perda-por-vendedor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_perda_por_vendedor' as any)
        .select('*');

      if (error) throw error;
      return (data || []) as unknown as PerdaPorVendedor[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const usePerformanceVendedores = () => {
  return useQuery<PerformanceVendedor[]>({
    queryKey: ['performance-vendedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_performance_vendedores' as any)
        .select('*');

      if (error) throw error;
      return (data || []) as unknown as PerformanceVendedor[];
    },
    staleTime: 5 * 60 * 1000,
  });
};
