
-- Drop old vendor SELECT policy and replace with expanded one
DROP POLICY IF EXISTS "Users can view own clients" ON public.clientes;

CREATE POLICY "Users can view own or unassigned clients"
ON public.clientes FOR SELECT TO authenticated
USING (
  auth.uid() = representante_id
  OR is_admin_or_gestor(representante_id)
);

-- Allow vendors to update admin-owned clients (to claim them)
DROP POLICY IF EXISTS "Users can update own clients" ON public.clientes;

CREATE POLICY "Users can update own or unassigned clients"
ON public.clientes FOR UPDATE TO authenticated
USING (
  auth.uid() = representante_id
  OR is_admin_or_gestor(representante_id)
);
