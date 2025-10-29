-- Adicionar campos de endereço à tabela prospects
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS endereco_completo TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS cep TEXT;

-- Criar tabela de visitas a prospects
CREATE TABLE IF NOT EXISTS public.prospect_visitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  responsavel_id UUID NOT NULL REFERENCES public.profiles(id),
  data_visita DATE NOT NULL,
  horario_inicio TIME,
  horario_fim TIME,
  status TEXT NOT NULL DEFAULT 'agendada',
  observacoes TEXT,
  evento_id UUID REFERENCES public.colaborador_eventos(id) ON DELETE SET NULL,
  ordem_rota INTEGER,
  distancia_km NUMERIC,
  tempo_trajeto_min INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_prospect_visitas_prospect ON public.prospect_visitas(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_visitas_responsavel ON public.prospect_visitas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_prospect_visitas_data ON public.prospect_visitas(data_visita);
CREATE INDEX IF NOT EXISTS idx_prospects_coords ON public.prospects(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Enable RLS
ALTER TABLE public.prospect_visitas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para prospect_visitas
CREATE POLICY "Todos podem ver visitas" 
ON public.prospect_visitas 
FOR SELECT 
USING (true);

CREATE POLICY "Usuários autenticados podem criar visitas" 
ON public.prospect_visitas 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar visitas" 
ON public.prospect_visitas 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar visitas" 
ON public.prospect_visitas 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_prospect_visitas_updated_at
  BEFORE UPDATE ON public.prospect_visitas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();