ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS regime_tributario text,
  ADD COLUMN IF NOT EXISTS marcas_concorrentes text;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS regime_tributario text,
  ADD COLUMN IF NOT EXISTS marcas_concorrentes text;