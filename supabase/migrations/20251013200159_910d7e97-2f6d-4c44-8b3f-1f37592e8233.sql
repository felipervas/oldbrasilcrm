-- Criar tabela de roles separada (CRÍTICO para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Habilitar RLS na tabela de roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver seus próprios roles
CREATE POLICY "Usuários podem ver seus próprios roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política: apenas admins podem inserir/atualizar roles
CREATE POLICY "Apenas admins podem gerenciar roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Migrar dados existentes da tabela profiles para user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, perfil
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Criar função security definer para verificar roles (evita recursão RLS)
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

-- Função auxiliar para verificar múltiplos roles
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

-- ATUALIZAR POLÍTICAS DE CLIENTES
DROP POLICY IF EXISTS "Usuários veem seus clientes ou todos se admin/gestor" ON public.clientes;
DROP POLICY IF EXISTS "Usuários podem inserir clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar seus clientes ou todos se admin/gestor" ON public.clientes;

CREATE POLICY "Usuários veem seus clientes ou todos se admin/gestor"
ON public.clientes
FOR SELECT
TO authenticated
USING (
  responsavel_id = auth.uid() 
  OR public.has_any_role(auth.uid(), ARRAY['admin', 'gestor', 'leitura']::user_role[])
);

CREATE POLICY "Usuários podem inserir clientes"
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (
  responsavel_id = auth.uid()
  OR public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[])
);

CREATE POLICY "Usuários podem atualizar seus clientes ou todos se admin/gestor"
ON public.clientes
FOR UPDATE
TO authenticated
USING (
  responsavel_id = auth.uid()
  OR public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[])
);

-- ATUALIZAR POLÍTICAS DE INTERAÇÕES
DROP POLICY IF EXISTS "Usuários veem interações de seus clientes ou todas se admin/gestor" ON public.interacoes;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias interações" ON public.interacoes;
DROP POLICY IF EXISTS "Usuários podem atualizar suas interações ou todas se admin/g" ON public.interacoes;

CREATE POLICY "Usuários veem suas interações ou de seus clientes"
ON public.interacoes
FOR SELECT
TO authenticated
USING (
  usuario_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.id = interacoes.cliente_id
    AND c.responsavel_id = auth.uid()
  )
  OR public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[])
);

CREATE POLICY "Usuários podem inserir suas próprias interações"
ON public.interacoes
FOR INSERT
TO authenticated
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas interações"
ON public.interacoes
FOR UPDATE
TO authenticated
USING (
  usuario_id = auth.uid()
  OR public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[])
);

-- ATUALIZAR POLÍTICAS DE TAREFAS
DROP POLICY IF EXISTS "Usuários veem suas tarefas ou todas se admin/gestor" ON public.tarefas;
DROP POLICY IF EXISTS "Admin e gestor podem inserir tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Usuários podem atualizar suas tarefas ou todas se admin/gestor" ON public.tarefas;

CREATE POLICY "Usuários veem suas tarefas ou todas se admin/gestor"
ON public.tarefas
FOR SELECT
TO authenticated
USING (
  responsavel_id = auth.uid()
  OR public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[])
);

CREATE POLICY "Usuários podem inserir tarefas"
ON public.tarefas
FOR INSERT
TO authenticated
WITH CHECK (
  responsavel_id = auth.uid()
  OR public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[])
);

CREATE POLICY "Usuários podem atualizar suas tarefas"
ON public.tarefas
FOR UPDATE
TO authenticated
USING (
  responsavel_id = auth.uid()
  OR public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[])
);

-- ATUALIZAR POLÍTICAS DE MARCAS
DROP POLICY IF EXISTS "Todos podem ver marcas" ON public.marcas;
DROP POLICY IF EXISTS "Colaboradores podem ver marcas" ON public.marcas;
DROP POLICY IF EXISTS "Admin e gestor podem inserir marcas" ON public.marcas;
DROP POLICY IF EXISTS "Admin e gestor podem atualizar marcas" ON public.marcas;

CREATE POLICY "Colaboradores podem ver marcas"
ON public.marcas
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor', 'colaborador']::user_role[]));

CREATE POLICY "Admin e gestor podem inserir marcas"
ON public.marcas
FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[]));

CREATE POLICY "Admin e gestor podem atualizar marcas"
ON public.marcas
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[]));

-- ATUALIZAR POLÍTICAS DE PRODUTOS
DROP POLICY IF EXISTS "Todos podem ver produtos" ON public.produtos;
DROP POLICY IF EXISTS "Colaboradores podem ver produtos" ON public.produtos;
DROP POLICY IF EXISTS "Admin e gestor podem inserir produtos" ON public.produtos;
DROP POLICY IF EXISTS "Admin e gestor podem atualizar produtos" ON public.produtos;

CREATE POLICY "Colaboradores podem ver produtos"
ON public.produtos
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor', 'colaborador']::user_role[]));

CREATE POLICY "Admin e gestor podem inserir produtos"
ON public.produtos
FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[]));

CREATE POLICY "Admin e gestor podem atualizar produtos"
ON public.produtos
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[]));

-- ATUALIZAR POLÍTICAS DE CLIENTE_PRODUTOS
DROP POLICY IF EXISTS "Todos podem ver relacionamentos cliente-produto" ON public.cliente_produtos;
DROP POLICY IF EXISTS "Usuários veem relacionamentos de seus clientes" ON public.cliente_produtos;
DROP POLICY IF EXISTS "Admin e gestor podem inserir relacionamentos" ON public.cliente_produtos;
DROP POLICY IF EXISTS "Admin e gestor podem atualizar relacionamentos" ON public.cliente_produtos;

CREATE POLICY "Usuários veem relacionamentos de seus clientes"
ON public.cliente_produtos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.id = cliente_produtos.cliente_id
    AND (c.responsavel_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[]))
  )
);

CREATE POLICY "Admin e gestor podem inserir relacionamentos"
ON public.cliente_produtos
FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[]));

CREATE POLICY "Admin e gestor podem atualizar relacionamentos"
ON public.cliente_produtos
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[]));

-- ATUALIZAR POLÍTICA DE PROFILES (restringir acesso)
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários veem seu próprio perfil ou todos se admin/gestor" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;

CREATE POLICY "Usuários veem seu próprio perfil ou todos se admin/gestor"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::user_role[])
);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);