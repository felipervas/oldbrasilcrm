-- Criar view otimizada para prospects com última interação
-- Isso elimina N+1 queries na página de prospects
CREATE OR REPLACE VIEW prospects_with_last_interaction AS
SELECT 
  p.*,
  pi.data_interacao as ultima_interacao,
  pr_resp.nome as responsavel_nome,
  pr_criador.nome as criado_por_nome
FROM prospects p
LEFT JOIN LATERAL (
  SELECT data_interacao 
  FROM prospect_interacoes 
  WHERE prospect_interacoes.prospect_id = p.id 
  ORDER BY data_interacao DESC 
  LIMIT 1
) pi ON true
LEFT JOIN profiles pr_resp ON pr_resp.id = p.responsavel_id
LEFT JOIN profiles pr_criador ON pr_criador.id = p.criado_por_id;

-- Criar índice para melhorar performance de queries de prospects
CREATE INDEX IF NOT EXISTS idx_prospect_interacoes_prospect_data 
ON prospect_interacoes(prospect_id, data_interacao DESC);

-- Criar índice para melhorar performance de queries de pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_data_pedido 
ON pedidos(data_pedido DESC);

-- Criar índice para melhorar performance de queries de tarefas
CREATE INDEX IF NOT EXISTS idx_tarefas_status_data 
ON tarefas(status, data_prevista);