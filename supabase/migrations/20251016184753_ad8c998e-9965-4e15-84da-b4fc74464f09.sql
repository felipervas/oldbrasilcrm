-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Apenas admins podem gerenciar roles" ON user_roles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios roles" ON user_roles;

-- Create a security definer function to check if a user has a specific role
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

-- Create new policies using the security definer function
CREATE POLICY "Usuários podem ver seus próprios roles"
ON user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar todos os roles"
ON user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem ver todos os roles"
ON user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin'));