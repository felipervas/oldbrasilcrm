-- Criar tabela para leads da landing page
CREATE TABLE IF NOT EXISTS public.leads_landing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  empresa TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  mensagem TEXT,
  origem TEXT DEFAULT 'landing_page',
  status TEXT DEFAULT 'novo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.leads_landing ENABLE ROW LEVEL SECURITY;

-- Política para admins visualizarem leads
CREATE POLICY "Admins podem ver todos os leads"
  ON public.leads_landing
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil = 'admin'
    )
  );

-- Qualquer pessoa pode inserir leads (formulário público)
CREATE POLICY "Qualquer um pode inserir leads"
  ON public.leads_landing
  FOR INSERT
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_leads_landing_created ON public.leads_landing(created_at DESC);
CREATE INDEX idx_leads_landing_status ON public.leads_landing(status);
CREATE INDEX idx_leads_landing_email ON public.leads_landing(email);