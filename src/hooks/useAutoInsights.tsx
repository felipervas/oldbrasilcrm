import { useIAInsights } from './useIAInsights';
import { supabase } from '@/integrations/supabase/client';

export const useAutoInsights = () => {
  const { generateInsights } = useIAInsights();

  const triggerInsightsIfNeeded = async (
    prospectId: string,
    nomeEmpresa: string,
    segmento?: string,
    cidade?: string
  ) => {
    // Verificar se já tem insights
    const { data: existing } = await supabase
      .from('prospect_ia_insights')
      .select('id')
      .eq('prospect_id', prospectId)
      .maybeSingle();

    if (!existing) {
      // Gerar automaticamente
      generateInsights({
        prospectId,
        nomeEmpresa,
        segmento,
        cidade,
      });
    }
  };

  return { triggerInsightsIfNeeded };
};
