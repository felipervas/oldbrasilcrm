-- Recriar a view prospects_with_last_interaction com security_invoker
DROP VIEW IF EXISTS prospects_with_last_interaction;

CREATE VIEW prospects_with_last_interaction 
WITH (security_invoker = on)
AS
SELECT 
  p.*,
  pr.nome as responsavel_nome,
  pc.nome as criado_por_nome,
  pi.data_interacao as ultima_interacao
FROM prospects p
LEFT JOIN profiles pr ON p.responsavel_id = pr.id
LEFT JOIN profiles pc ON p.criado_por_id = pc.id
LEFT JOIN LATERAL (
  SELECT data_interacao
  FROM prospect_interacoes
  WHERE prospect_id = p.id
  ORDER BY data_interacao DESC
  LIMIT 1
) pi ON true
ORDER BY p.score DESC NULLS LAST, p.created_at DESC;

-- Recriar as views de análise com security_invoker
DROP VIEW IF EXISTS v_analise_perda;
CREATE VIEW v_analise_perda
WITH (security_invoker = on)
AS
SELECT 
  motivo_perda,
  COUNT(*) as total_perdas,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM prospects WHERE status = 'perdido'), 0), 2) as percentual
FROM prospects
WHERE status = 'perdido' AND motivo_perda IS NOT NULL
GROUP BY motivo_perda
ORDER BY total_perdas DESC;

DROP VIEW IF EXISTS v_perda_por_vendedor;
CREATE VIEW v_perda_por_vendedor
WITH (security_invoker = on)
AS
SELECT 
  p.responsavel_id as vendedor_id,
  pr.nome as vendedor_nome,
  COUNT(CASE WHEN p.status = 'perdido' THEN 1 END) as total_perdidos,
  COUNT(CASE WHEN p.status = 'ganho' THEN 1 END) as total_ganhos,
  COUNT(*) as total_prospects,
  ROUND(COUNT(CASE WHEN p.status = 'ganho' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as taxa_conversao
FROM prospects p
LEFT JOIN profiles pr ON p.responsavel_id = pr.id
WHERE p.responsavel_id IS NOT NULL
GROUP BY p.responsavel_id, pr.nome
ORDER BY taxa_conversao DESC;

DROP VIEW IF EXISTS v_performance_vendedores;
CREATE VIEW v_performance_vendedores
WITH (security_invoker = on)
AS
SELECT 
  pr.id as vendedor_id,
  pr.nome as vendedor_nome,
  COALESCE(SUM(pe.valor_total), 0) as faturamento_total,
  COUNT(DISTINCT pe.id) as total_pedidos,
  COALESCE(AVG(pe.valor_total), 0) as ticket_medio,
  COUNT(DISTINCT CASE WHEN p.status = 'ganho' THEN p.id END) as prospects_convertidos,
  COUNT(DISTINCT p.id) as total_prospects,
  ROUND(COUNT(DISTINCT CASE WHEN p.status = 'ganho' THEN p.id END) * 100.0 / 
    NULLIF(COUNT(DISTINCT p.id), 0), 2) as taxa_conversao,
  COUNT(DISTINCT CASE WHEN t.status = 'concluida' THEN t.id END) as tarefas_concluidas,
  COUNT(DISTINCT t.id) as total_tarefas,
  COALESCE(AVG(EXTRACT(EPOCH FROM (pi_first.data_interacao - p.created_at)) / 3600), 0) as tempo_primeira_resposta_horas
FROM profiles pr
LEFT JOIN prospects p ON pr.id = p.responsavel_id
LEFT JOIN pedidos pe ON pr.id = pe.responsavel_venda_id
LEFT JOIN tarefas t ON pr.id = t.responsavel_id
LEFT JOIN LATERAL (
  SELECT MIN(data_interacao) as data_interacao
  FROM prospect_interacoes
  WHERE prospect_id = p.id
) pi_first ON true
GROUP BY pr.id, pr.nome
ORDER BY faturamento_total DESC;