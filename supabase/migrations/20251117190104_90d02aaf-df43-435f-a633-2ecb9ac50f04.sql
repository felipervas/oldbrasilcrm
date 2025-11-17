-- Criar função RPC otimizada para dashboard stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_optimized()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stats_result json;
  hoje date;
BEGIN
  hoje := CURRENT_DATE;
  
  SELECT json_build_object(
    'totalClientes', (SELECT COUNT(*) FROM clientes WHERE ativo = true),
    'tarefasPendentes', (SELECT COUNT(*) FROM tarefas WHERE status = 'pendente'),
    'interacoesHoje', (SELECT COUNT(*) FROM interacoes WHERE date(data_hora) = hoje),
    'tarefasAtrasadas', (SELECT COUNT(*) FROM tarefas WHERE status = 'pendente' AND data_prevista < hoje),
    'amostrasEnviadas', (SELECT COUNT(*) FROM amostras),
    'totalProdutos', (SELECT COUNT(*) FROM produtos WHERE ativo = true),
    'entregasPendentes', (SELECT COUNT(*) FROM pedidos WHERE data_previsao_entrega IS NOT NULL AND status NOT IN ('cancelado', 'entregue'))
  ) INTO stats_result;
  
  RETURN stats_result;
END;
$$;