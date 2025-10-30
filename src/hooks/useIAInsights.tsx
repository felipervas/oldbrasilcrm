import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

export const useIAInsights = (prospectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar insights existentes
  const { data: insights, isLoading } = useQuery({
    queryKey: ['prospect-ia-insights', prospectId],
    staleTime: 300000, // Cache por 5 minutos
    queryFn: async () => {
      if (!prospectId) return null;
      
      const { data, error } = await supabase
        .from('prospect_ia_insights')
        .select('prospect_id, resumo_empresa, produtos_recomendados, dicas_abordagem, informacoes_publicas')
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
      const { data, error } = await supabase.functions.invoke('gerar-insights-melhorado', {
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

  // Gerar roteiro com IA
  const generateRoteiro = useMutation({
    mutationFn: async ({ visitas, dataRota }: { visitas: any[]; dataRota: string }) => {
      const { data, error } = await supabase.functions.invoke('gerar-roteiro-ia', {
        body: { visitas, dataRota }
      });

      if (error) throw error;
      return data;
    },
  });

  const generateInsightsCallback = useCallback(
    (params: { prospectId: string; nomeEmpresa: string; segmento?: string; cidade?: string }) => 
      generateInsights.mutateAsync(params),
    [generateInsights]
  );

  return {
    insights,
    isLoading,
    generateInsights: generateInsightsCallback,
    isGenerating: generateInsights.isPending,
    generateRoteiro,
  };
};