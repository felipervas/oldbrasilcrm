-- Add granular pricing/discount fields to itens_pedido
ALTER TABLE public.itens_pedido
  ADD COLUMN IF NOT EXISTS preco_tabela numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_praticado numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_pct numeric NOT NULL DEFAULT 0;

-- Backfill existing rows: assume preco_unitario was the practiced price; tabela = same
UPDATE public.itens_pedido
SET preco_praticado = preco_unitario,
    preco_tabela = preco_unitario
WHERE preco_praticado = 0 AND preco_unitario > 0;

-- Add general discount/freight breakdown fields to pedidos
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS desconto_geral_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_geral_valor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frete_valor numeric NOT NULL DEFAULT 0;

-- Backfill: copy current frete column into new frete_valor for existing rows
UPDATE public.pedidos
SET frete_valor = COALESCE(frete, 0)
WHERE frete_valor = 0 AND COALESCE(frete, 0) > 0;