-- Correção adicional de segurança

-- Corrigir todas as funções restantes com search_path mutável
ALTER FUNCTION public.processar_clientes_inativos() SET search_path = 'public';
ALTER FUNCTION public.atualizar_metricas_cliente() SET search_path = 'public';
ALTER FUNCTION public.calcular_metricas_cliente(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_cliente_produtos_historico(uuid) SET search_path = 'public';
ALTER FUNCTION public.calcular_score_prospect(uuid) SET search_path = 'public';
ALTER FUNCTION public.atualizar_score_prospect_trigger() SET search_path = 'public';
ALTER FUNCTION public.atualizar_score_apos_interacao() SET search_path = 'public';
ALTER FUNCTION public.atualizar_estoque() SET search_path = 'public';
ALTER FUNCTION public.atualizar_ultima_compra() SET search_path = 'public';
ALTER FUNCTION public.refresh_dashboard_views() SET search_path = 'public';

-- Revogar acesso público às materialized views (expor apenas através de funções)
REVOKE ALL ON mv_faturamento_clientes FROM anon, authenticated;
REVOKE ALL ON mv_faturamento_marcas FROM anon, authenticated;
REVOKE ALL ON mv_performance_vendedores FROM anon, authenticated;

-- Criar funções seguras para acessar as materialized views
CREATE OR REPLACE FUNCTION get_faturamento_clientes()
RETURNS SETOF mv_faturamento_clientes
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM mv_faturamento_clientes
  WHERE pode_ver_faturamento(auth.uid())
  ORDER BY faturamento_total DESC;
$$;

CREATE OR REPLACE FUNCTION get_faturamento_marcas()
RETURNS SETOF mv_faturamento_marcas
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM mv_faturamento_marcas
  WHERE pode_ver_faturamento(auth.uid())
  ORDER BY faturamento_total DESC;
$$;

CREATE OR REPLACE FUNCTION get_performance_vendedores()
RETURNS SETOF mv_performance_vendedores
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM mv_performance_vendedores
  WHERE pode_ver_faturamento(auth.uid())
  ORDER BY faturamento_total DESC;
$$;