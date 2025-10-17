-- FASE 1: Corrigir política RLS para permitir inserção de produtos
DROP POLICY IF EXISTS "Todos podem inserir produtos" ON public.produtos;

CREATE POLICY "Todos podem inserir produtos"
  ON public.produtos
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- FASE 3: Adicionar coluna para identificar tabela de preço da loja
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS tabela_preco_loja TEXT;

COMMENT ON COLUMN public.produtos.tabela_preco_loja IS 
  'Identifica qual tabela de preço usar na loja (ex: comissao_5, comissao_10) - útil para marcas com múltiplas variações de preço';