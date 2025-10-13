-- Adicionar campo aniversario em clientes
ALTER TABLE clientes ADD COLUMN aniversario date;

-- Criar tabela de pedidos para clientes
CREATE TABLE IF NOT EXISTS pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id),
  numero_pedido text,
  data_pedido date,
  valor_total numeric,
  status text DEFAULT 'pendente',
  arquivo_url text,
  arquivo_nome text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de contatos internos de clientes
CREATE TABLE IF NOT EXISTS contatos_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id),
  nome text NOT NULL,
  cargo text,
  email text,
  telefone text,
  aniversario date,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de comentários internos
CREATE TABLE IF NOT EXISTS comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo text NOT NULL, -- 'cliente', 'tarefa', 'interacao', etc
  entidade_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  comentario text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS para pedidos
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem pedidos de seus clientes"
ON pedidos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.id = pedidos.cliente_id
    AND (c.responsavel_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role]))
  )
);

CREATE POLICY "Usuários podem inserir pedidos"
ON pedidos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.id = pedidos.cliente_id
    AND (c.responsavel_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role]))
  )
);

CREATE POLICY "Usuários podem atualizar pedidos"
ON pedidos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.id = pedidos.cliente_id
    AND (c.responsavel_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role]))
  )
);

-- RLS para contatos_clientes
ALTER TABLE contatos_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem contatos de seus clientes"
ON contatos_clientes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.id = contatos_clientes.cliente_id
    AND (c.responsavel_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role]))
  )
);

CREATE POLICY "Usuários podem inserir contatos"
ON contatos_clientes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.id = contatos_clientes.cliente_id
    AND (c.responsavel_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role]))
  )
);

CREATE POLICY "Usuários podem atualizar contatos"
ON contatos_clientes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.id = contatos_clientes.cliente_id
    AND (c.responsavel_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role]))
  )
);

CREATE POLICY "Usuários podem deletar contatos"
ON contatos_clientes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.id = contatos_clientes.cliente_id
    AND (c.responsavel_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role]))
  )
);

-- RLS para comentarios
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Colaboradores podem ver comentários"
ON comentarios FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role, 'colaborador'::user_role]));

CREATE POLICY "Colaboradores podem inserir comentários"
ON comentarios FOR INSERT
WITH CHECK (usuario_id = auth.uid() AND has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role, 'colaborador'::user_role]));

-- Criar bucket de pedidos se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('pedidos', 'pedidos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para bucket de pedidos
CREATE POLICY "Usuários podem visualizar pedidos de seus clientes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pedidos' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Usuários podem fazer upload de pedidos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pedidos' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Usuários podem atualizar pedidos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pedidos' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Usuários podem deletar pedidos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pedidos' AND
  auth.uid() IS NOT NULL
);