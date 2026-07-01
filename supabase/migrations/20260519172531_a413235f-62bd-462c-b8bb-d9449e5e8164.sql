ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS parcelas_visivel_pdf boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS parcelas_modo_pdf text NOT NULL DEFAULT 'datas';