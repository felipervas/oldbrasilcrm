-- Correções de Segurança e Performance (corrigido)

-- 1. SEGURANÇA: Corrigir search_path das funções
ALTER FUNCTION public.atualizar_contador_pedidos() SET search_path = 'public';
ALTER FUNCTION public.atualizar_data_preco() SET search_path = 'public';
ALTER FUNCTION public.registrar_historico_amostra() SET search_path = 'public';
ALTER FUNCTION public.log_changes() SET search_path = 'public';

-- 2. PERFORMANCE: Criar índices para buscas frequentes (sem trigram)
CREATE INDEX IF NOT EXISTS idx_clientes_nome_fantasia ON clientes (nome_fantasia);
CREATE INDEX IF NOT EXISTS idx_clientes_razao_social ON clientes (razao_social);
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj_cpf ON clientes (cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes (telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON clientes (ativo) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos (nome);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo_visivel ON produtos (ativo, visivel_loja) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_produtos_marca_id ON produtos (marca_id) WHERE ativo = true AND visivel_loja = true;

CREATE INDEX IF NOT EXISTS idx_pedidos_numero_pedido ON pedidos (numero_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_data ON pedidos (cliente_id, data_pedido DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_responsavel_data ON pedidos (responsavel_venda_id, data_pedido DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos (status);

CREATE INDEX IF NOT EXISTS idx_prospects_nome_empresa ON prospects (nome_empresa);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects (status);
CREATE INDEX IF NOT EXISTS idx_prospects_responsavel_id ON prospects (responsavel_id);
CREATE INDEX IF NOT EXISTS idx_prospects_score ON prospects (score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_tarefas_status_data ON tarefas (status, data_prevista);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel_status ON tarefas (responsavel_id, status);

-- 3. PERFORMANCE: Otimizar função get_dashboard_stats_optimized
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_optimized()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;