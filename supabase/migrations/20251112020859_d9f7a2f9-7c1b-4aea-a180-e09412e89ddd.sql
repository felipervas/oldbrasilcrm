-- ===================================================
-- FASE 2: VIEWS MATERIALIZADAS PARA GESTOR DASHBOARD
-- ===================================================

-- View 1: Faturamento por Cliente (com cache)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_faturamento_clientes AS
SELECT 
  c.id as cliente_id,
  c.nome_fantasia,
  COUNT(p.id) as total_pedidos,
  COALESCE(SUM(p.valor_total), 0) as faturamento_total,
  MAX(p.data_pedido) as ultima_compra
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.status != 'cancelado'
GROUP BY c.id, c.nome_fantasia;

-- View 2: Faturamento por Marca (com cache)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_faturamento_marcas AS
SELECT 
  m.id as marca_id,
  m.nome as marca,
  COUNT(DISTINCT pp.pedido_id) as total_pedidos,
  COALESCE(SUM(pp.quantidade * pp.preco_unitario), 0) as faturamento_total,
  COALESCE(SUM(pp.quantidade), 0) as quantidade_total
FROM marcas m
LEFT JOIN produtos prod ON prod.marca_id = m.id
LEFT JOIN pedidos_produtos pp ON pp.produto_id = prod.id
GROUP BY m.id, m.nome;

-- View 3: Performance por Vendedor (com cache)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_performance_vendedores AS
SELECT 
  p.id as vendedor_id,
  p.nome,
  COUNT(ped.id) as total_pedidos,
  COALESCE(SUM(ped.valor_total), 0) as faturamento_total,
  COALESCE(AVG(ped.valor_total), 0) as ticket_medio
FROM profiles p
LEFT JOIN pedidos ped ON ped.responsavel_venda_id = p.id AND ped.status != 'cancelado'
GROUP BY p.id, p.nome;

-- Criar índices nas views materializadas para performance
CREATE INDEX IF NOT EXISTS idx_mv_fat_clientes_faturamento ON mv_faturamento_clientes(faturamento_total DESC);
CREATE INDEX IF NOT EXISTS idx_mv_fat_marcas_faturamento ON mv_faturamento_marcas(faturamento_total DESC);
CREATE INDEX IF NOT EXISTS idx_mv_perf_vendedores_faturamento ON mv_performance_vendedores(faturamento_total DESC);

-- Função para atualizar as views materializadas
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_faturamento_clientes;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_faturamento_marcas;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_performance_vendedores;
END;
$$;

-- Políticas RLS para as views materializadas
ALTER MATERIALIZED VIEW mv_faturamento_clientes OWNER TO postgres;
ALTER MATERIALIZED VIEW mv_faturamento_marcas OWNER TO postgres;
ALTER MATERIALIZED VIEW mv_performance_vendedores OWNER TO postgres;

-- Comentários para documentação
COMMENT ON MATERIALIZED VIEW mv_faturamento_clientes IS 'Cache de faturamento agregado por cliente - atualizar com refresh_dashboard_views()';
COMMENT ON MATERIALIZED VIEW mv_faturamento_marcas IS 'Cache de faturamento agregado por marca - atualizar com refresh_dashboard_views()';
COMMENT ON MATERIALIZED VIEW mv_performance_vendedores IS 'Cache de performance de vendedores - atualizar com refresh_dashboard_views()';