-- Criar tabela para insights de IA sobre prospects
CREATE TABLE IF NOT EXISTS public.prospect_ia_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE UNIQUE,
  resumo_empresa TEXT,
  produtos_recomendados TEXT[],
  dicas_abordagem TEXT[],
  informacoes_publicas TEXT,
  gerado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.prospect_ia_insights ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Todos podem ver insights" ON public.prospect_ia_insights
  FOR SELECT USING (true);

CREATE POLICY "Usuários autenticados podem inserir insights" ON public.prospect_ia_insights
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar insights" ON public.prospect_ia_insights
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_prospect_visitas_data ON public.prospect_visitas(data_visita);
CREATE INDEX IF NOT EXISTS idx_prospect_visitas_responsavel ON public.prospect_visitas(responsavel_id, data_visita);
CREATE INDEX IF NOT EXISTS idx_prospect_visitas_status ON public.prospect_visitas(status);
CREATE INDEX IF NOT EXISTS idx_colaborador_eventos_data ON public.colaborador_eventos(data, colaborador_id);
CREATE INDEX IF NOT EXISTS idx_prospect_ia_insights_prospect ON public.prospect_ia_insights(prospect_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_prospect_ia_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prospect_ia_insights_updated_at
  BEFORE UPDATE ON public.prospect_ia_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prospect_ia_insights_updated_at();