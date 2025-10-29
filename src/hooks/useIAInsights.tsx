import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useIAInsights = (prospectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar insights existentes
  const { data: insights, isLoading } = useQuery({
    queryKey: ['prospect-ia-insights', prospectId],
    queryFn: async () => {
      if (!prospectId) return null;
      
      const { data, error } = await supabase
        .from('prospect_ia_insights')
        .select('*')
        .eq('prospect_id', prospectId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!prospectId,
  });

  // Gerar novos insights
  const generateInsights = useMutation({
    mutationFn: async ({ 
      prospectId, 
      nomeEmpresa, 
      segmento, 
      cidade 
    }: { 
      prospectId: string; 
      nomeEmpresa: string; 
      segmento?: string; 
      cidade?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('gerar-insights-prospect', {
        body: { prospectId, nomeEmpresa, segmento, cidade }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospect-ia-insights'] });
      toast({ 
        title: '🧠 Insights gerados com sucesso!',
        description: 'Informações sobre o prospect foram atualizadas.'
      });
    },
    onError: (error: any) => {
      console.error('Erro ao gerar insights:', error);
      
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast({ 
          title: '⏱️ Limite de requisições atingido',
          description: 'Aguarde alguns instantes e tente novamente.',
          variant: 'destructive'
        });
      } else if (error.message?.includes('402') || error.message?.includes('créditos')) {
        toast({ 
          title: '💳 Créditos insuficientes',
          description: 'Adicione créditos ao workspace em Settings → Usage.',
          variant: 'destructive'
        });
      } else {
        toast({ 
          title: 'Erro ao gerar insights',
          description: error.message || 'Tente novamente mais tarde.',
          variant: 'destructive'
        });
      }
    },
  });

  return {
    insights,
    isLoading,
    generateInsights: generateInsights.mutate,
    isGenerating: generateInsights.isPending,
  };
};