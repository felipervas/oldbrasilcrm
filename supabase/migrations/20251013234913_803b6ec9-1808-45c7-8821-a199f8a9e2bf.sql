-- Remover função existente com CASCADE (isso vai remover a policy que a usa)
DROP FUNCTION IF EXISTS pode_ver_faturamento(uuid) CASCADE;

-- Recriar função com parâmetro correto
CREATE OR REPLACE FUNCTION pode_ver_faturamento(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  RETURN (
    user_email = 'felipervas@gmail.com' OR
    user_email LIKE '%@oldvasconcellos.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_clientes_responsavel ON clientes(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON clientes(ativo);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON tarefas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_data_prevista ON tarefas(data_prevista);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON pedidos(data_pedido);
CREATE INDEX IF NOT EXISTS idx_interacoes_cliente ON interacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_usuario ON interacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_contatos_cliente ON contatos_clientes(cliente_id);

-- Atualizar RLS de pedidos para permitir que todos insiram e editem
DROP POLICY IF EXISTS "Usuários podem inserir pedidos" ON pedidos;
DROP POLICY IF EXISTS "Usuários podem atualizar pedidos" ON pedidos;

CREATE POLICY "Todos podem inserir pedidos"
ON pedidos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Todos podem atualizar pedidos"
ON pedidos FOR UPDATE
TO authenticated
USING (true);

-- Recriar policy de SELECT com a nova função
CREATE POLICY "Usuários veem pedidos de seus clientes"
ON pedidos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.id = pedidos.cliente_id
    AND (
      c.responsavel_id = auth.uid()
      OR has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role])
      OR pode_ver_faturamento(auth.uid())
    )
  )
);