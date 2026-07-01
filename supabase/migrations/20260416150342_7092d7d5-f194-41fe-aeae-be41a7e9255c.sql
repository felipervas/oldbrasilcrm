
DROP POLICY "Users can update own or unassigned clients" ON public.clientes;

CREATE POLICY "Users can update own or unassigned clients" ON public.clientes
  FOR UPDATE TO authenticated
  USING ((auth.uid() = representante_id) OR is_admin_or_gestor(auth.uid()));
