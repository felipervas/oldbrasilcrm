
-- Clientes: liberar todas as operações
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can update own or unassigned clients" ON public.clientes;
CREATE POLICY "Authenticated can insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update clientes" ON public.clientes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete clientes" ON public.clientes FOR DELETE TO authenticated USING (true);

-- Pedidos: liberar todas as operações
DROP POLICY IF EXISTS "Users can delete own orders" ON public.pedidos;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.pedidos;
DROP POLICY IF EXISTS "Users can update own orders" ON public.pedidos;
CREATE POLICY "Authenticated can insert pedidos" ON public.pedidos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update pedidos" ON public.pedidos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete pedidos" ON public.pedidos FOR DELETE TO authenticated USING (true);

-- Itens de pedido: liberar todas as operações
DROP POLICY IF EXISTS "Users can delete own order items" ON public.itens_pedido;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.itens_pedido;
DROP POLICY IF EXISTS "Users can update own order items" ON public.itens_pedido;
CREATE POLICY "Authenticated can insert itens_pedido" ON public.itens_pedido FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update itens_pedido" ON public.itens_pedido FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete itens_pedido" ON public.itens_pedido FOR DELETE TO authenticated USING (true);
