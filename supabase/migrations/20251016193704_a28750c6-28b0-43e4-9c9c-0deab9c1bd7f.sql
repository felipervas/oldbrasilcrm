-- Etapa 1: Criar função security definer para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Remover a política antiga que causa recursão infinita
DROP POLICY IF EXISTS "Admins podem gerenciar roles" ON public.user_roles;

-- Criar nova política para admins gerenciarem roles usando a função security definer
CREATE POLICY "Admins podem gerenciar roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));