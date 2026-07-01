
-- Clientes: liberar SELECT a todos autenticados
DROP POLICY IF EXISTS "Users can view own or unassigned clients" ON public.clientes;
DROP POLICY IF EXISTS "Managers can view all clients" ON public.clientes;
CREATE POLICY "Authenticated can view all clientes"
  ON public.clientes FOR SELECT TO authenticated
  USING (true);

-- Pedidos: liberar SELECT a todos autenticados
DROP POLICY IF EXISTS "Users can view own orders" ON public.pedidos;
DROP POLICY IF EXISTS "Managers can view all orders" ON public.pedidos;
CREATE POLICY "Authenticated can view all pedidos"
  ON public.pedidos FOR SELECT TO authenticated
  USING (true);

-- Itens de pedido: liberar SELECT a todos autenticados
DROP POLICY IF EXISTS "Users can view own order items" ON public.itens_pedido;
DROP POLICY IF EXISTS "Managers can view all order items" ON public.itens_pedido;
CREATE POLICY "Authenticated can view all itens_pedido"
  ON public.itens_pedido FOR SELECT TO authenticated
  USING (true);
