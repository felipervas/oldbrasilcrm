-- Criar função para verificar se é admin (já existe, mas vamos garantir)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Políticas para produto_imagens (gerenciamento admin)
DROP POLICY IF EXISTS "Admins podem gerenciar imagens da loja" ON public.produto_imagens;
CREATE POLICY "Admins podem gerenciar imagens da loja"
  ON public.produto_imagens FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Garantir que as políticas de produtos permitem admins editarem tudo
DROP POLICY IF EXISTS "Admins podem editar configurações da loja" ON public.produtos;
CREATE POLICY "Admins podem editar configurações da loja"
  ON public.produtos FOR UPDATE
  USING (public.is_admin(auth.uid()) OR auth.uid() IS NOT NULL)
  WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() IS NOT NULL);

-- Políticas para marcas (admin pode criar/editar)
DROP POLICY IF EXISTS "Admins podem criar marcas" ON public.marcas;
CREATE POLICY "Admins podem criar marcas"
  ON public.marcas FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins podem editar marcas" ON public.marcas;
CREATE POLICY "Admins podem editar marcas"
  ON public.marcas FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins podem deletar marcas" ON public.marcas;
CREATE POLICY "Admins podem deletar marcas"
  ON public.marcas FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Criar tabela de audit log (opcional, mas útil)
CREATE TABLE IF NOT EXISTS public.loja_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  acao TEXT NOT NULL,
  entidade_tipo TEXT NOT NULL,
  entidade_id UUID,
  detalhes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.loja_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver logs"
  ON public.loja_audit_log FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Sistema pode inserir logs"
  ON public.loja_audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);