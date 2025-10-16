-- Criar tabela de eventos/anotações do colaborador
CREATE TABLE IF NOT EXISTS public.colaborador_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL,
  horario TIME,
  tipo TEXT NOT NULL DEFAULT 'evento',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.colaborador_eventos ENABLE ROW LEVEL SECURITY;

-- Policies para colaborador_eventos
CREATE POLICY "Usuários podem ver seus próprios eventos"
  ON public.colaborador_eventos FOR SELECT
  USING (auth.uid() = colaborador_id);

CREATE POLICY "Usuários podem criar seus próprios eventos"
  ON public.colaborador_eventos FOR INSERT
  WITH CHECK (auth.uid() = colaborador_id);

CREATE POLICY "Usuários podem atualizar seus próprios eventos"
  ON public.colaborador_eventos FOR UPDATE
  USING (auth.uid() = colaborador_id);

CREATE POLICY "Usuários podem deletar seus próprios eventos"
  ON public.colaborador_eventos FOR DELETE
  USING (auth.uid() = colaborador_id);

-- Índices para performance
CREATE INDEX idx_colaborador_eventos_colaborador ON public.colaborador_eventos(colaborador_id);
CREATE INDEX idx_colaborador_eventos_data ON public.colaborador_eventos(data);

-- Trigger para updated_at
CREATE TRIGGER update_colaborador_eventos_updated_at
  BEFORE UPDATE ON public.colaborador_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();