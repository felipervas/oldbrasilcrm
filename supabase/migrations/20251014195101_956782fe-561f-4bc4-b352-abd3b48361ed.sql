-- Permitir exclusão de produtos
DROP POLICY IF EXISTS "Colaboradores podem deletar produtos" ON public.produtos;
CREATE POLICY "Colaboradores podem deletar produtos"
ON public.produtos
FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role, 'colaborador'::user_role]));

-- Permitir exclusão de pedidos
DROP POLICY IF EXISTS "Colaboradores podem deletar pedidos" ON public.pedidos;
CREATE POLICY "Colaboradores podem deletar pedidos"
ON public.pedidos
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM clientes c
    WHERE c.id = pedidos.cliente_id
    AND (c.responsavel_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role]))
  )
);