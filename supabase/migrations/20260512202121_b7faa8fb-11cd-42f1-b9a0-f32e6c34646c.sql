-- View agregada para retenção de clientes (performance: 1 query, não N).
-- Considera somente pedidos confirmados (status != 'Rascunho').
-- Calcula: último pedido, total pedidos, e intervalo médio entre pedidos nos últimos 12 meses.

CREATE OR REPLACE VIEW public.cliente_retencao_metrics AS
WITH pedidos_confirmados AS (
  SELECT
    cliente_id,
    COALESCE(data_conclusao, created_at) AS pedido_data
  FROM public.pedidos
  WHERE status::text <> 'Rascunho'
    AND cliente_id IS NOT NULL
),
agg AS (
  SELECT
    cliente_id,
    MAX(pedido_data) AS ultima_compra_data,
    COUNT(*) AS total_pedidos
  FROM pedidos_confirmados
  GROUP BY cliente_id
),
intervalos AS (
  SELECT
    cliente_id,
    EXTRACT(EPOCH FROM (pedido_data - LAG(pedido_data) OVER (PARTITION BY cliente_id ORDER BY pedido_data))) / 86400.0 AS dias_intervalo
  FROM pedidos_confirmados
  WHERE pedido_data >= (now() - interval '12 months')
),
medias AS (
  SELECT
    cliente_id,
    AVG(dias_intervalo) AS intervalo_medio_dias,
    COUNT(dias_intervalo) AS qtd_intervalos
  FROM intervalos
  WHERE dias_intervalo IS NOT NULL
  GROUP BY cliente_id
)
SELECT
  c.id AS cliente_id,
  a.ultima_compra_data,
  COALESCE(a.total_pedidos, 0) AS total_pedidos,
  CASE
    WHEN a.ultima_compra_data IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (now() - a.ultima_compra_data))::int
  END AS dias_desde_ultima_compra,
  CASE
    WHEN COALESCE(m.qtd_intervalos, 0) >= 1 THEN ROUND(m.intervalo_medio_dias::numeric, 1)
    ELSE NULL
  END AS intervalo_medio_dias
FROM public.clientes c
LEFT JOIN agg a ON a.cliente_id = c.id
LEFT JOIN medias m ON m.cliente_id = c.id;

-- Habilitar RLS no escopo da view: views herdam permissões; concedemos SELECT a authenticated.
GRANT SELECT ON public.cliente_retencao_metrics TO authenticated;