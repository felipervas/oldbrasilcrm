ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unidade_medida TEXT,
  ADD COLUMN IF NOT EXISTS peso_liquido NUMERIC,
  ADD COLUMN IF NOT EXISTS volume NUMERIC,
  ADD COLUMN IF NOT EXISTS descricao_detalhada TEXT,
  ADD COLUMN IF NOT EXISTS codigo_referencia TEXT;
