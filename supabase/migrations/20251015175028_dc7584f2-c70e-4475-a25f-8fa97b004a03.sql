-- Índices compostos para otimização extrema
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel_status ON tarefas(responsavel_id, status);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel_created ON tarefas(responsavel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_amostras_cliente_created ON amostras(cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_data ON pedidos(cliente_id, data_pedido DESC);
CREATE INDEX IF NOT EXISTS idx_interacoes_cliente_data ON interacoes(cliente_id, data_hora DESC);

-- Índices para nome_fantasia e nome (sem trigram por enquanto)
CREATE INDEX IF NOT EXISTS idx_clientes_nome_fantasia ON clientes(nome_fantasia);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);