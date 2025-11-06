import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProspectsOptimized = () => {
  return useQuery({
    queryKey: ['prospects-optimized'],
    queryFn: async () => {
      // Usar a view otimizada que já inclui a última interação
      const { data, error } = await supabase
        .from('prospects_with_last_interaction')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
  });
};
