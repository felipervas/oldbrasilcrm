-- Tornar cliente_id nullable em tarefas
ALTER TABLE public.tarefas ALTER COLUMN cliente_id DROP NOT NULL;

-- Criar tabela de histórico de observações por cliente
CREATE TABLE IF NOT EXISTS public.cliente_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  observacao TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'observacao', -- 'observacao', 'amostra', 'pedido', 'interacao'
  referencia_id UUID, -- ID da entidade relacionada (amostra_id, pedido_id, etc)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_cliente_historico_cliente ON public.cliente_historico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_historico_created ON public.cliente_historico(created_at DESC);

-- Adicionar índice em amostras para melhor performance
CREATE INDEX IF NOT EXISTS idx_amostras_cliente ON public.amostras(cliente_id);
CREATE INDEX IF NOT EXISTS idx_amostras_status ON public.amostras(status);

-- Enable RLS
ALTER TABLE public.cliente_historico ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para cliente_historico
CREATE POLICY "Todos podem ver histórico"
ON public.cliente_historico
FOR SELECT
USING (true);

CREATE POLICY "Usuários autenticados podem inserir histórico"
ON public.cliente_historico
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Atualizar política de amostras para permitir deleção
DROP POLICY IF EXISTS "Todos podem deletar amostras" ON public.amostras;
CREATE POLICY "Usuários autenticados podem deletar amostras"
ON public.amostras
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger para adicionar ao histórico quando criar/atualizar amostra
CREATE OR REPLACE FUNCTION public.registrar_historico_amostra()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.cliente_historico (cliente_id, usuario_id, observacao, tipo, referencia_id)
    VALUES (
      NEW.cliente_id,
      NEW.responsavel_id,
      'Nova amostra: ' || (SELECT nome FROM produtos WHERE id = NEW.produto_id) || ' - Qtd: ' || NEW.quantidade || COALESCE(' - ' || NEW.observacoes, ''),
      'amostra',
      NEW.id
    );
  ELSIF TG_OP = 'UPDATE' AND (OLD.status != NEW.status OR OLD.retorno != NEW.retorno) THEN
    INSERT INTO public.cliente_historico (cliente_id, usuario_id, observacao, tipo, referencia_id)
    VALUES (
      NEW.cliente_id,
      NEW.responsavel_id,
      'Amostra atualizada: Status ' || NEW.status || COALESCE(' - Retorno: ' || NEW.retorno, ''),
      'amostra',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_historico_amostra
AFTER INSERT OR UPDATE ON public.amostras
FOR EACH ROW
EXECUTE FUNCTION public.registrar_historico_amostra();