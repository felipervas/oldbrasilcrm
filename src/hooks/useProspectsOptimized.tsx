import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProspectsOptimized = () => {
  return useQuery({
    queryKey: ['prospects-optimized'],
    queryFn: async () => {
      // Usar a view otimizada que já inclui a última interação
      // Adicionar limit para melhorar performance
      const { data, error } = await supabase
        .from('prospects_with_last_interaction')
        .select('*')
        .order('score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
  });
};
