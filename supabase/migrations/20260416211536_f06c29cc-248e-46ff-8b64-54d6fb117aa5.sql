-- Permitir que admins e gestores vejam todos os pedidos, itens e rotas
CREATE POLICY "Managers can view all orders"
  ON public.pedidos FOR SELECT
  TO authenticated
  USING (is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can view all order items"
  ON public.itens_pedido FOR SELECT
  TO authenticated
  USING (is_admin_or_gestor(auth.uid()));

CREATE POLICY "Managers can view all routes"
  ON public.rotas FOR SELECT
  TO authenticated
  USING (is_admin_or_gestor(auth.uid()));