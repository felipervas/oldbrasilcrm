-- Adicionar métricas de compra aos clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS total_comprado NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS compra_mensal_media NUMERIC DEFAULT 0;

-- Criar função para calcular métricas de compra
CREATE OR REPLACE FUNCTION public.calcular_metricas_cliente(cliente_uuid UUID)
RETURNS TABLE (
  total_comprado NUMERIC,
  compra_mensal_media NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total NUMERIC;
  media_mensal NUMERIC;
  meses_ativo INTEGER;
  primeira_compra DATE;
BEGIN
  -- Calcular total comprado (excluindo cancelados)
  SELECT COALESCE(SUM(valor_total), 0)
  INTO total
  FROM public.pedidos
  WHERE cliente_id = cliente_uuid
    AND status != 'cancelado';
  
  -- Pegar data da primeira compra
  SELECT MIN(data_pedido)
  INTO primeira_compra
  FROM public.pedidos
  WHERE cliente_id = cliente_uuid
    AND status != 'cancelado';
  
  -- Calcular média mensal
  IF primeira_compra IS NOT NULL THEN
    -- Calcular número de meses desde a primeira compra
    meses_ativo := GREATEST(1, EXTRACT(YEAR FROM AGE(CURRENT_DATE, primeira_compra)) * 12 + 
                                EXTRACT(MONTH FROM AGE(CURRENT_DATE, primeira_compra)));
    media_mensal := total / meses_ativo;
  ELSE
    media_mensal := 0;
  END IF;
  
  RETURN QUERY SELECT total, media_mensal;
END;
$$;

-- Criar trigger para atualizar métricas quando pedido é inserido/atualizado
CREATE OR REPLACE FUNCTION public.atualizar_metricas_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metricas RECORD;
BEGIN
  -- Recalcular métricas para o cliente
  SELECT * FROM calcular_metricas_cliente(NEW.cliente_id) INTO metricas;
  
  UPDATE public.clientes
  SET 
    total_comprado = metricas.total_comprado,
    compra_mensal_media = metricas.compra_mensal_media
  WHERE id = NEW.cliente_id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_atualizar_metricas ON public.pedidos;
CREATE TRIGGER trigger_atualizar_metricas
AFTER INSERT OR UPDATE OF valor_total, status ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION atualizar_metricas_cliente();