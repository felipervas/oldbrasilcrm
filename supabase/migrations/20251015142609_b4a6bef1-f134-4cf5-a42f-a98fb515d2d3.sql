-- Criar enum de roles se não existir
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'gestor', 'colaborador', 'leitura');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Atualizar função has_role para usar user_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Criar função has_any_role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles user_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = ANY(_roles)
  )
$$;

-- Atualizar políticas para CLIENTES - todos podem ver todos os clientes
DROP POLICY IF EXISTS "Usuários veem seus clientes ou todos se admin/gestor" ON public.clientes;
CREATE POLICY "Todos podem ver clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Usuários podem inserir clientes" ON public.clientes;
CREATE POLICY "Colaboradores podem inserir clientes"
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Usuários podem atualizar seus clientes ou todos se admin/gesto" ON public.clientes;
CREATE POLICY "Colaboradores podem atualizar clientes"
ON public.clientes
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Atualizar políticas para PRODUTOS - todos podem ver e gerenciar
DROP POLICY IF EXISTS "Colaboradores podem ver produtos" ON public.produtos;
CREATE POLICY "Todos podem ver produtos"
ON public.produtos
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Colaboradores autenticados podem inserir produtos" ON public.produtos;
CREATE POLICY "Todos podem inserir produtos"
ON public.produtos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Colaboradores autenticados podem atualizar produtos" ON public.produtos;
CREATE POLICY "Todos podem atualizar produtos"
ON public.produtos
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Colaboradores podem deletar produtos" ON public.produtos;
CREATE POLICY "Todos podem deletar produtos"
ON public.produtos
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Atualizar políticas para TAREFAS - todos podem ver todas as tarefas
DROP POLICY IF EXISTS "Usuários veem suas tarefas ou todas se admin/gestor" ON public.tarefas;
CREATE POLICY "Todos podem ver tarefas"
ON public.tarefas
FOR SELECT
TO authenticated
USING (true);

-- Atualizar políticas para INTERAÇÕES - todos podem ver todas
DROP POLICY IF EXISTS "Usuários veem suas interações ou de seus clientes" ON public.interacoes;
CREATE POLICY "Todos podem ver interações"
ON public.interacoes
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Usuários podem atualizar suas interações" ON public.interacoes;
CREATE POLICY "Todos podem atualizar interações"
ON public.interacoes
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Atualizar políticas para PEDIDOS - todos podem ver todos
DROP POLICY IF EXISTS "Usuários veem pedidos de seus clientes" ON public.pedidos;
CREATE POLICY "Todos podem ver pedidos"
ON public.pedidos
FOR SELECT
TO authenticated
USING (true);

-- Atualizar políticas para MARCAS - todos podem ver todas
DROP POLICY IF EXISTS "Colaboradores podem ver marcas" ON public.marcas;
CREATE POLICY "Todos podem ver marcas"
ON public.marcas
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Colaboradores autenticados podem inserir marcas" ON public.marcas;
CREATE POLICY "Todos podem inserir marcas"
ON public.marcas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Colaboradores autenticados podem atualizar marcas" ON public.marcas;
CREATE POLICY "Todos podem atualizar marcas"
ON public.marcas
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Atualizar políticas para AMOSTRAS - todos podem ver todas
DROP POLICY IF EXISTS "Colaboradores podem ver amostras" ON public.amostras;
CREATE POLICY "Todos podem ver amostras"
ON public.amostras
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Colaboradores podem inserir amostras" ON public.amostras;
CREATE POLICY "Todos podem inserir amostras"
ON public.amostras
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Colaboradores podem atualizar amostras" ON public.amostras;
CREATE POLICY "Todos podem atualizar amostras"
ON public.amostras
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin e gestor podem deletar amostras" ON public.amostras;
CREATE POLICY "Todos podem deletar amostras"
ON public.amostras
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Atualizar políticas para CONTATOS - todos podem ver todos
DROP POLICY IF EXISTS "Usuários veem contatos de seus clientes" ON public.contatos_clientes;
CREATE POLICY "Todos podem ver contatos"
ON public.contatos_clientes
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Usuários podem inserir contatos" ON public.contatos_clientes;
CREATE POLICY "Todos podem inserir contatos"
ON public.contatos_clientes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Usuários podem atualizar contatos" ON public.contatos_clientes;
CREATE POLICY "Todos podem atualizar contatos"
ON public.contatos_clientes
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Usuários podem deletar contatos" ON public.contatos_clientes;
CREATE POLICY "Todos podem deletar contatos"
ON public.contatos_clientes
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Atualizar políticas para CLIENTE_PRODUTOS - todos podem ver todos
DROP POLICY IF EXISTS "Usuários veem relacionamentos de seus clientes" ON public.cliente_produtos;
CREATE POLICY "Todos podem ver relacionamentos"
ON public.cliente_produtos
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin e gestor podem inserir relacionamentos" ON public.cliente_produtos;
CREATE POLICY "Todos podem inserir relacionamentos"
ON public.cliente_produtos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin e gestor podem atualizar relacionamentos" ON public.cliente_produtos;
CREATE POLICY "Todos podem atualizar relacionamentos"
ON public.cliente_produtos
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Atualizar políticas para COMENTÁRIOS - todos podem ver todos
DROP POLICY IF EXISTS "Colaboradores podem ver comentários" ON public.comentarios;
CREATE POLICY "Todos podem ver comentários"
ON public.comentarios
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Colaboradores podem inserir comentários" ON public.comentarios;
CREATE POLICY "Todos podem inserir comentários"
ON public.comentarios
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Atualizar políticas para MOVIMENTAÇÃO DE ESTOQUE - todos podem ver todas
DROP POLICY IF EXISTS "Colaboradores podem ver movimentações" ON public.movimentacao_estoque;
CREATE POLICY "Todos podem ver movimentações"
ON public.movimentacao_estoque
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Colaboradores podem inserir movimentações" ON public.movimentacao_estoque;
CREATE POLICY "Todos podem inserir movimentações"
ON public.movimentacao_estoque
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Atualizar políticas para PROFILES - todos podem ver todos os perfis
DROP POLICY IF EXISTS "Usuários veem seu próprio perfil ou todos se admin/gestor" ON public.profiles;
CREATE POLICY "Todos podem ver perfis"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_clientes_responsavel ON public.clientes(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON public.clientes(ativo);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON public.tarefas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_cliente ON public.tarefas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON public.tarefas(status);
CREATE INDEX IF NOT EXISTS idx_interacoes_cliente ON public.interacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_usuario ON public.interacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON public.pedidos(data_pedido);
CREATE INDEX IF NOT EXISTS idx_produtos_marca ON public.produtos(marca_id);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON public.produtos(ativo);