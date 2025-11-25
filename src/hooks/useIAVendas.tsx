import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useIAVendas() {
  // Insights do Cliente
  const gerarInsightsCliente = useMutation({
    mutationFn: async (clienteId: string) => {
      const { data, error } = await supabase.functions.invoke('gerar-insights-cliente', {
        body: { clienteId },
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Erro ao gerar insights:', error);
      toast.error('Erro ao gerar insights do cliente');
    },
  });

  // Qualificação de Lead
  const qualificarLead = useMutation({
    mutationFn: async (leadData: any) => {
      const { data, error } = await supabase.functions.invoke('qualificar-lead', {
        body: leadData,
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Erro ao qualificar lead:', error);
      toast.error('Erro ao qualificar lead');
    },
  });

  // Script de Vendas
  const gerarScript = useMutation({
    mutationFn: async (params: {
      clienteNome: string;
      segmento?: string;
      situacao?: string;
      objetivo?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('gerar-script-vendas', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Erro ao gerar script:', error);
      toast.error('Erro ao gerar script de vendas');
    },
  });

  // Resumo Diário
  const { data: resumoDiario, isLoading: loadingResumoDiario, refetch: refetchResumoDiario } = useQuery({
    queryKey: ['resumo-diario-vendas'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('resumo-diario-vendas', {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    enabled: false, // Só busca quando solicitado
  });

  return {
    gerarInsightsCliente,
    qualificarLead,
    gerarScript,
    resumoDiario,
    loadingResumoDiario,
    refetchResumoDiario,
  };
}