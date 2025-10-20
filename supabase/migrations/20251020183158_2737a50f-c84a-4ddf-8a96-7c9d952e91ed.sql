-- =========================================
-- FASE 1: GERENCIAR EQUIPE - MÚLTIPLOS CONTATOS
-- =========================================

-- Adicionar campos jsonb para múltiplos emails e telefones
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS emails jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS telefones jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.emails IS 
  'Array de emails: [{email: string, tipo: "principal"|"secundario", verificado: boolean}]';
  
COMMENT ON COLUMN public.profiles.telefones IS 
  'Array de telefones: [{numero: string, tipo: "principal"|"secundario", verificado: boolean}]';

-- =========================================
-- FASE 2: TAREFAS - VISIBILIDADE E TRACKING
-- =========================================

-- Adicionar colunas para visibilidade de tarefas
ALTER TABLE public.tarefas
ADD COLUMN IF NOT EXISTS visibilidade text DEFAULT 'individual' 
  CHECK (visibilidade IN ('individual', 'equipe')),
ADD COLUMN IF NOT EXISTS realizada_por_id uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.tarefas.visibilidade IS 
  'Define se a tarefa é individual (apenas responsável vê) ou de equipe (todos veem)';

COMMENT ON COLUMN public.tarefas.realizada_por_id IS 
  'UUID de quem marcou a tarefa como concluída (pode ser diferente do responsável)';

-- =========================================
-- FASE 3: CLIENTES - MÚLTIPLOS CONTATOS COM TIPOS
-- =========================================

-- Adicionar campos aos contatos de clientes
ALTER TABLE public.contatos_clientes
ADD COLUMN IF NOT EXISTS tipo_contato text DEFAULT 'geral' 
  CHECK (tipo_contato IN ('compras', 'operacional', 'comercial', 'financeiro', 'geral')),
ADD COLUMN IF NOT EXISTS verificado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fonte text DEFAULT 'manual' 
  CHECK (fonte IN ('manual', 'cnpj', 'importacao'));

COMMENT ON COLUMN public.contatos_clientes.tipo_contato IS 'Setor/responsabilidade do contato';
COMMENT ON COLUMN public.contatos_clientes.verificado IS 'Se o contato foi verificado/validado';
COMMENT ON COLUMN public.contatos_clientes.fonte IS 'Origem do contato (manual, CNPJ, importação)';

-- =========================================
-- FASE 4: MARCAS - TABELAS DE PREÇOS E CONTATOS
-- =========================================

-- Relacionar tabelas de preços com marcas
ALTER TABLE public.catalogos
ADD COLUMN IF NOT EXISTS marca_id uuid REFERENCES public.marcas(id);

CREATE INDEX IF NOT EXISTS idx_catalogos_marca ON public.catalogos(marca_id);

-- Criar tabela de contatos de marca
CREATE TABLE IF NOT EXISTS public.marca_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id uuid REFERENCES public.marcas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text,
  email text,
  telefone text,
  tipo text CHECK (tipo IN ('compras', 'comercial', 'suporte', 'financeiro')),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marca_contatos_marca ON public.marca_contatos(marca_id);

-- RLS para marca_contatos
ALTER TABLE public.marca_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver contatos de marca"
ON public.marca_contatos FOR SELECT
USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar contatos"
ON public.marca_contatos FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- =========================================
-- FASE 5: RECEITAS - CAMPO CLIENTE
-- =========================================

-- Adicionar cliente_id para receitas de clientes
ALTER TABLE public.receitas
ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id);

CREATE INDEX IF NOT EXISTS idx_receitas_cliente ON public.receitas(cliente_id);

-- =========================================
-- FASE 6: HISTÓRICO DE EQUIPE
-- =========================================

-- Criar tabela de histórico de atividades da equipe
CREATE TABLE IF NOT EXISTS public.historico_equipe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  acao text NOT NULL,
  entidade_tipo text,
  entidade_id uuid,
  detalhes jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_equipe_user ON public.historico_equipe(user_id);
CREATE INDEX IF NOT EXISTS idx_historico_equipe_created ON public.historico_equipe(created_at DESC);

-- RLS para histórico_equipe
ALTER TABLE public.historico_equipe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver histórico"
ON public.historico_equipe FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('gestor', 'admin')
  )
);

CREATE POLICY "Sistema pode inserir histórico"
ON public.historico_equipe FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);