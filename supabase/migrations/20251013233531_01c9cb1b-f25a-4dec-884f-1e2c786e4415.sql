-- Criar tabela de movimentação de estoque
CREATE TABLE IF NOT EXISTS public.movimentacao_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade INTEGER NOT NULL,
  observacao TEXT,
  responsavel_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para melhorar performance
CREATE INDEX idx_movimentacao_produto ON public.movimentacao_estoque(produto_id);

-- Adicionar campo de estoque atual nos produtos
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS estoque_escritorio INTEGER DEFAULT 0;

-- Adicionar última data de pedido nos clientes (calculado automaticamente)
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS ultima_compra_data DATE;

-- RLS para movimentação_estoque
ALTER TABLE public.movimentacao_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Colaboradores podem ver movimentações"
ON public.movimentacao_estoque
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role, 'colaborador'::user_role]));

CREATE POLICY "Colaboradores podem inserir movimentações"
ON public.movimentacao_estoque
FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role, 'colaborador'::user_role])
  AND responsavel_id = auth.uid()
);

-- Função para atualizar estoque automaticamente
CREATE OR REPLACE FUNCTION public.atualizar_estoque()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.produtos 
    SET estoque_escritorio = estoque_escritorio + NEW.quantidade
    WHERE id = NEW.produto_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE public.produtos 
    SET estoque_escritorio = estoque_escritorio - NEW.quantidade
    WHERE id = NEW.produto_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para atualizar estoque
CREATE TRIGGER trigger_atualizar_estoque
AFTER INSERT ON public.movimentacao_estoque
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_estoque();

-- Função para atualizar última data de compra
CREATE OR REPLACE FUNCTION public.atualizar_ultima_compra()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.clientes 
  SET ultima_compra_data = NEW.data_pedido
  WHERE id = NEW.cliente_id
  AND (ultima_compra_data IS NULL OR NEW.data_pedido > ultima_compra_data);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para atualizar última compra
CREATE TRIGGER trigger_atualizar_ultima_compra
AFTER INSERT OR UPDATE OF data_pedido ON public.pedidos
FOR EACH ROW
WHEN (NEW.data_pedido IS NOT NULL)
EXECUTE FUNCTION public.atualizar_ultima_compra();

-- Criar função para verificar se o email do usuário tem permissão para ver faturamento
CREATE OR REPLACE FUNCTION public.pode_ver_faturamento(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id 
    AND (
      email LIKE '%felipervas@gmail.com%' 
      OR email LIKE '%oldvasconcellos.com%'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Atualizar política de visualização de pedidos
DROP POLICY IF EXISTS "Usuários veem pedidos de seus clientes" ON public.pedidos;

CREATE POLICY "Usuários veem pedidos de seus clientes"
ON public.pedidos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.id = pedidos.cliente_id
    AND (
      c.responsavel_id = auth.uid()
      OR has_any_role(auth.uid(), ARRAY['admin'::user_role, 'gestor'::user_role])
      OR pode_ver_faturamento(auth.uid())
    )
  )
);