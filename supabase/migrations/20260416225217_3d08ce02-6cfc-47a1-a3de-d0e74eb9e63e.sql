ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS motivo_inativacao text,
  ADD COLUMN IF NOT EXISTS inativado_em timestamp with time zone;