-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Admins podem gerenciar todos os roles" ON user_roles;
DROP POLICY IF EXISTS "Gestores podem ver todos os roles" ON user_roles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios roles" ON user_roles;

-- Create simple policy: users can only see their own roles
CREATE POLICY "Usuários podem ver seus próprios roles"
ON user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy for admins to manage roles (using direct EXISTS, not has_role)
CREATE POLICY "Admins podem gerenciar roles"
ON user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles admin_check
    WHERE admin_check.user_id = auth.uid()
    AND admin_check.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1  
    FROM public.user_roles admin_check
    WHERE admin_check.user_id = auth.uid()
    AND admin_check.role = 'admin'
  )
);