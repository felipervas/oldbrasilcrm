import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAnalisePerda = () => {
  return useQuery({
    queryKey: ['analise-perda'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_analise_perda')
        .select('*');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const usePerdaPorVendedor = () => {
  return useQuery({
    queryKey: ['perda-por-vendedor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_perda_por_vendedor')
        .select('*');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const usePerformanceVendedores = () => {
  return useQuery({
    queryKey: ['performance-vendedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_performance_vendedores')
        .select('*');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};
