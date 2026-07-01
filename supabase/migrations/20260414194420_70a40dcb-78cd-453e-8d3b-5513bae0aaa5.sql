
-- Clientes: add missing import columns
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS id_old_brasil text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'PJ';
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cnpj_cpf text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS logradouro text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS municipio text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS dias_ultima_compra integer;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS total_pedidos integer DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tags text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS data_ultima_compra date;

-- Produtos: add missing columns (table already exists)
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS id_old_brasil text;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS referencia text;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS marca text;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS subcategoria text;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS saldo_estoque numeric(12,3) DEFAULT 0;

-- Pedidos: add vendedor_id (representante_id already exists but adding alias for import)
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS vendedor_id uuid;

-- Itens pedido: add referencia
ALTER TABLE public.itens_pedido ADD COLUMN IF NOT EXISTS referencia text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_situacao ON public.pedidos(situacao);
CREATE INDEX IF NOT EXISTS idx_pedidos_criado ON public.pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido ON public.itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_clientes_old_id ON public.clientes(id_old_brasil);
CREATE INDEX IF NOT EXISTS idx_produtos_marca ON public.produtos(marca);
