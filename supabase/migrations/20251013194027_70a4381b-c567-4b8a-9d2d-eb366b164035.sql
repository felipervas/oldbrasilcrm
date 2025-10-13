-- Criar enum para perfis de usuário
CREATE TYPE public.user_role AS ENUM ('admin', 'gestor', 'colaborador', 'leitura');

-- Criar enum para tipo de interação
CREATE TYPE public.interaction_type AS ENUM ('visita', 'ligacao');

-- Criar enum para sentimento
CREATE TYPE public.sentiment_type AS ENUM ('positivo', 'neutro', 'negativo');

-- Criar enum para status de interesse
CREATE TYPE public.interest_status AS ENUM ('comprando', 'interessado', 'parado');

-- Criar enum para tipo de tarefa
CREATE TYPE public.task_type AS ENUM ('visitar', 'ligar');

-- Criar enum para prioridade
CREATE TYPE public.priority_type AS ENUM ('baixa', 'media', 'alta');

-- Criar enum para status de tarefa
CREATE TYPE public.task_status AS ENUM ('pendente', 'em_andamento', 'concluida', 'cancelada');

-- Criar enum para resultado de interação
CREATE TYPE public.interaction_result AS ENUM ('concluida', 'nao_atendido', 'reagendada');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  perfil public.user_role NOT NULL DEFAULT 'colaborador',
  equipe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de marcas
CREATE TABLE public.marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  site TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  sku TEXT UNIQUE,
  marca_id UUID REFERENCES public.marcas(id) ON DELETE CASCADE,
  preco_base DECIMAL(10,2),
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT,
  cnpj_cpf TEXT,
  telefone TEXT,
  email TEXT,
  logradouro TEXT,
  numero TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  segmento TEXT,
  tamanho TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  responsavel_id UUID REFERENCES public.profiles(id),
  tags TEXT[],
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de relacionamento Cliente-Produto
CREATE TABLE public.cliente_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  status_interesse public.interest_status NOT NULL DEFAULT 'interessado',
  ultimo_pedido_data DATE,
  volume_medio DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, produto_id)
);

-- Tabela de tarefas
CREATE TABLE public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo public.task_type NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  responsavel_id UUID NOT NULL REFERENCES public.profiles(id),
  prioridade public.priority_type NOT NULL DEFAULT 'media',
  status public.task_status NOT NULL DEFAULT 'pendente',
  data_prevista DATE,
  data_conclusao TIMESTAMPTZ,
  origem TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de interações
CREATE TABLE public.interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  tipo public.interaction_type NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  resultado public.interaction_result NOT NULL DEFAULT 'concluida',
  sentimento public.sentiment_type,
  motivo TEXT,
  comentario TEXT,
  duracao_min INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Usuários podem ver todos os perfis"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Policies para marcas (todos podem ver, apenas admin/gestor podem modificar)
CREATE POLICY "Todos podem ver marcas"
  ON public.marcas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin e gestor podem inserir marcas"
  ON public.marcas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND perfil IN ('admin', 'gestor')
    )
  );

CREATE POLICY "Admin e gestor podem atualizar marcas"
  ON public.marcas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND perfil IN ('admin', 'gestor')
    )
  );

-- Policies para produtos
CREATE POLICY "Todos podem ver produtos"
  ON public.produtos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin e gestor podem inserir produtos"
  ON public.produtos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND perfil IN ('admin', 'gestor')
    )
  );

CREATE POLICY "Admin e gestor podem atualizar produtos"
  ON public.produtos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND perfil IN ('admin', 'gestor')
    )
  );

-- Policies para clientes
CREATE POLICY "Todos podem ver clientes"
  ON public.clientes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin e gestor podem inserir clientes"
  ON public.clientes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND perfil IN ('admin', 'gestor')
    )
  );

CREATE POLICY "Admin e gestor podem atualizar clientes"
  ON public.clientes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND perfil IN ('admin', 'gestor')
    )
  );

-- Policies para cliente_produtos
CREATE POLICY "Todos podem ver relacionamentos cliente-produto"
  ON public.cliente_produtos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin e gestor podem inserir relacionamentos"
  ON public.cliente_produtos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND perfil IN ('admin', 'gestor')
    )
  );

CREATE POLICY "Admin e gestor podem atualizar relacionamentos"
  ON public.cliente_produtos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND perfil IN ('admin', 'gestor')
    )
  );

-- Policies para tarefas
CREATE POLICY "Usuários veem suas tarefas ou todas se admin/gestor"
  ON public.tarefas FOR SELECT
  TO authenticated
  USING (
    responsavel_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND perfil IN ('admin', 'gestor', 'leitura')
    )
  );

CREATE POLICY "Admin e gestor podem inserir tarefas"
  ON public.tarefas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND perfil IN ('admin', 'gestor')
    )
  );

CREATE POLICY "Usuários podem atualizar suas tarefas ou todas se admin/gestor"
  ON public.tarefas FOR UPDATE
  TO authenticated
  USING (
    responsavel_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND perfil IN ('admin', 'gestor')
    )
  );

-- Policies para interações
CREATE POLICY "Todos podem ver interações"
  ON public.interacoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem inserir suas próprias interações"
  ON public.interacoes FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas interações ou todas se admin/gestor"
  ON public.interacoes FOR UPDATE
  TO authenticated
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND perfil IN ('admin', 'gestor')
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_marcas
  BEFORE UPDATE ON public.marcas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_produtos
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_clientes
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_cliente_produtos
  BEFORE UPDATE ON public.cliente_produtos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_tarefas
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_interacoes
  BEFORE UPDATE ON public.interacoes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para criar profile ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    'colaborador'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Índices para melhor performance
CREATE INDEX idx_clientes_responsavel ON public.clientes(responsavel_id);
CREATE INDEX idx_clientes_cidade ON public.clientes(cidade);
CREATE INDEX idx_tarefas_responsavel ON public.tarefas(responsavel_id);
CREATE INDEX idx_tarefas_cliente ON public.tarefas(cliente_id);
CREATE INDEX idx_tarefas_data_prevista ON public.tarefas(data_prevista);
CREATE INDEX idx_interacoes_cliente ON public.interacoes(cliente_id);
CREATE INDEX idx_interacoes_usuario ON public.interacoes(usuario_id);
CREATE INDEX idx_interacoes_data ON public.interacoes(data_hora);
CREATE INDEX idx_produtos_marca ON public.produtos(marca_id);