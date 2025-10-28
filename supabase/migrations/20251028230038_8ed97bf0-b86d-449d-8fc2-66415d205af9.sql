-- Criar tabela de prospects (possíveis clientes)
CREATE TABLE public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa TEXT NOT NULL,
  cidade TEXT,
  estado TEXT,
  porte TEXT CHECK (porte IN ('Grande', 'Médio', 'Pequeno')),
  produto_utilizado TEXT,
  telefone TEXT,
  email TEXT,
  site TEXT,
  responsavel_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_contato', 'aguardando_retorno', 'em_negociacao', 'proposta_enviada', 'ganho', 'perdido', 'futuro')),
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('alta', 'media', 'baixa')),
  data_ultimo_contato DATE,
  data_proximo_contato DATE,
  origem TEXT DEFAULT 'manual',
  observacoes TEXT,
  convertido_cliente_id UUID REFERENCES public.clientes(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de interações com prospects
CREATE TABLE public.prospect_interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  tipo_interacao TEXT NOT NULL CHECK (tipo_interacao IN ('ligacao', 'email', 'whatsapp', 'visita', 'reuniao', 'outro')),
  data_interacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  descricao TEXT NOT NULL,
  resultado TEXT CHECK (resultado IN ('positivo', 'neutro', 'negativo')),
  proximo_passo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_interacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para prospects
CREATE POLICY "Todos podem ver prospects"
  ON public.prospects FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir prospects"
  ON public.prospects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar prospects"
  ON public.prospects FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar prospects"
  ON public.prospects FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para prospect_interacoes
CREATE POLICY "Todos podem ver interações de prospects"
  ON public.prospect_interacoes FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem inserir suas próprias interações"
  ON public.prospect_interacoes FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas próprias interações"
  ON public.prospect_interacoes FOR UPDATE
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem deletar suas próprias interações"
  ON public.prospect_interacoes FOR DELETE
  USING (usuario_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Índices para melhor performance
CREATE INDEX idx_prospects_status ON public.prospects(status);
CREATE INDEX idx_prospects_responsavel ON public.prospects(responsavel_id);
CREATE INDEX idx_prospects_estado ON public.prospects(estado);
CREATE INDEX idx_prospect_interacoes_prospect_id ON public.prospect_interacoes(prospect_id);
CREATE INDEX idx_prospect_interacoes_usuario_id ON public.prospect_interacoes(usuario_id);