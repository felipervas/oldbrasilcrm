
-- Add missing columns to pedidos
ALTER TABLE public.pedidos 
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS identificador text,
  ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'Pedido',
  ADD COLUMN IF NOT EXISTS origem text DEFAULT 'CRM',
  ADD COLUMN IF NOT EXISTS cliente_nome text,
  ADD COLUMN IF NOT EXISTS qtd_itens integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS situacao text DEFAULT 'Emitido',
  ADD COLUMN IF NOT EXISTS nota_fiscal text,
  ADD COLUMN IF NOT EXISTS data_conclusao timestamptz;

-- Add missing columns to itens_pedido
ALTER TABLE public.itens_pedido
  ADD COLUMN IF NOT EXISTS produto_nome text,
  ADD COLUMN IF NOT EXISTS produto_marca text,
  ADD COLUMN IF NOT EXISTS unidade_medida text DEFAULT 'Unidade';
