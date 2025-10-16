-- Adicionar submarca/linha aos produtos
ALTER TABLE public.produtos ADD COLUMN submarca TEXT;

-- Adicionar forma de pagamento aos pedidos
ALTER TABLE public.pedidos ADD COLUMN forma_pagamento TEXT;
ALTER TABLE public.pedidos ADD COLUMN parcelas INTEGER;
ALTER TABLE public.pedidos ADD COLUMN dias_pagamento TEXT;

-- Adicionar origem da saída nas amostras
ALTER TABLE public.amostras ADD COLUMN origem_saida TEXT DEFAULT 'escritorio';
COMMENT ON COLUMN public.amostras.origem_saida IS 'escritorio ou fabrica';