-- Tabela para armazenar leads da loja (contatos interessados em atendimento exclusivo)
CREATE TABLE public.loja_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  email text,
  telefone text,
  mensagem text,
  origem text DEFAULT 'modal_1min'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_ou_telefone_obrigatorio CHECK (
    email IS NOT NULL OR telefone IS NOT NULL
  )
);

-- RLS: Qualquer um pode inserir (público), mas só admins podem ver
ALTER TABLE public.loja_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode inserir leads"
  ON public.loja_leads
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins podem ver leads"
  ON public.loja_leads
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Índice para buscar leads por data
CREATE INDEX idx_loja_leads_created_at ON public.loja_leads(created_at DESC);

-- Comentário
COMMENT ON TABLE public.loja_leads IS 'Leads capturados na loja online (interessados em atendimento exclusivo)';