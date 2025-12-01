-- 1. Corrigir função pode_ver_financeiro mantendo assinatura original
CREATE OR REPLACE FUNCTION public.pode_ver_financeiro(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = pode_ver_financeiro.user_id
      AND ur.role IN ('gestor', 'admin')
  );
END;
$$;

-- 2. Recriar view de faturamento por cliente com índice UNIQUE
DROP MATERIALIZED VIEW IF EXISTS mv_faturamento_clientes CASCADE;
CREATE MATERIALIZED VIEW mv_faturamento_clientes AS
SELECT 
  c.id as cliente_id,
  c.nome_fantasia,
  COALESCE(SUM(p.valor_total), 0) as faturamento_total,
  COUNT(p.id) as total_pedidos
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.status != 'cancelado'
GROUP BY c.id, c.nome_fantasia;

CREATE UNIQUE INDEX idx_mv_fat_clientes_unique ON mv_faturamento_clientes(cliente_id);

-- 3. Recriar view de faturamento por marca com índice UNIQUE
DROP MATERIALIZED VIEW IF EXISTS mv_faturamento_marcas CASCADE;
CREATE MATERIALIZED VIEW mv_faturamento_marcas AS
SELECT 
  m.id as marca_id,
  m.nome as marca,
  COALESCE(SUM(pp.quantidade * pp.preco_unitario), 0) as faturamento_total,
  COALESCE(SUM(pp.quantidade), 0) as quantidade_total
FROM marcas m
LEFT JOIN produtos pr ON pr.marca_id = m.id
LEFT JOIN pedidos_produtos pp ON pp.produto_id = pr.id
LEFT JOIN pedidos p ON p.id = pp.pedido_id AND p.status != 'cancelado'
GROUP BY m.id, m.nome;

CREATE UNIQUE INDEX idx_mv_fat_marcas_unique ON mv_faturamento_marcas(marca_id);

-- 4. Recriar view de performance por vendedor com índice UNIQUE
DROP MATERIALIZED VIEW IF EXISTS mv_performance_vendedores CASCADE;
CREATE MATERIALIZED VIEW mv_performance_vendedores AS
SELECT 
  pr.id as vendedor_id,
  pr.nome,
  COALESCE(SUM(p.valor_total), 0) as faturamento_total,
  COUNT(p.id) as total_pedidos,
  CASE WHEN COUNT(p.id) > 0 
    THEN ROUND(SUM(p.valor_total) / COUNT(p.id), 2) 
    ELSE 0 
  END as ticket_medio
FROM profiles pr
LEFT JOIN pedidos p ON p.responsavel_venda_id = pr.id AND p.status != 'cancelado'
GROUP BY pr.id, pr.nome;

CREATE UNIQUE INDEX idx_mv_perf_vendedores_unique ON mv_performance_vendedores(vendedor_id);

-- 5. Atualizar função de refresh para usar CONCURRENTLY
CREATE OR REPLACE FUNCTION public.refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_faturamento_clientes;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_faturamento_marcas;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_performance_vendedores;
END;
$$;