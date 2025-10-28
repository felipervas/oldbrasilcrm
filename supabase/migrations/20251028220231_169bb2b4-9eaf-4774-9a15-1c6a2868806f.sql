-- Adicionar campos de entrega na tabela pedidos
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS data_previsao_entrega DATE,
ADD COLUMN IF NOT EXISTS data_entrega_realizada DATE,
ADD COLUMN IF NOT EXISTS observacoes_entrega TEXT;

-- Criar índice para otimizar consultas de entregas próximas
CREATE INDEX IF NOT EXISTS idx_pedidos_previsao_entrega 
ON pedidos(data_previsao_entrega) 
WHERE status NOT IN ('cancelado', 'entregue');

-- Função para calcular histórico de produtos do cliente
CREATE OR REPLACE FUNCTION get_cliente_produtos_historico(cliente_uuid UUID)
RETURNS TABLE (
  produto_id UUID,
  produto_nome TEXT,
  total_quantidade NUMERIC,
  primeira_compra DATE,
  ultima_compra DATE,
  dias_desde_ultima_compra INTEGER,
  total_pedidos INTEGER,
  status TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as produto_id,
    p.nome as produto_nome,
    SUM(pp.quantidade) as total_quantidade,
    MIN(ped.data_pedido)::DATE as primeira_compra,
    MAX(ped.data_pedido)::DATE as ultima_compra,
    (CURRENT_DATE - MAX(ped.data_pedido)::DATE) as dias_desde_ultima_compra,
    COUNT(DISTINCT ped.id)::INTEGER as total_pedidos,
    CASE 
      WHEN (CURRENT_DATE - MAX(ped.data_pedido)::DATE) > 60 THEN 'parado'
      WHEN (CURRENT_DATE - MAX(ped.data_pedido)::DATE) > 30 THEN 'risco'
      ELSE 'ativo'
    END as status
  FROM produtos p
  INNER JOIN pedidos_produtos pp ON pp.produto_id = p.id
  INNER JOIN pedidos ped ON ped.id = pp.pedido_id
  WHERE ped.cliente_id = cliente_uuid
    AND ped.status != 'cancelado'
  GROUP BY p.id, p.nome
  ORDER BY MAX(ped.data_pedido) DESC;
END;
$$;