-- Tabela para rastrear cliques no WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contexto TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  extra_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para consultas rápidas por data
CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_timestamp ON public.whatsapp_clicks(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_contexto ON public.whatsapp_clicks(contexto);

-- RLS não necessária pois são dados públicos de analytics
ALTER TABLE public.whatsapp_clicks ENABLE ROW LEVEL SECURITY;

-- Policy para permitir inserção pública (analytics)
CREATE POLICY "Permitir inserção pública de cliques WhatsApp"
  ON public.whatsapp_clicks
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy para leitura apenas para usuários autenticados (admin)
CREATE POLICY "Permitir leitura para usuários autenticados"
  ON public.whatsapp_clicks
  FOR SELECT
  TO authenticated
  USING (true);