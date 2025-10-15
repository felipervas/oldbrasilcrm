-- Adicionar campos para boletos no financeiro
ALTER TABLE public.financeiro 
ADD COLUMN IF NOT EXISTS tipo_transacao text,
ADD COLUMN IF NOT EXISTS data_vencimento date,
ADD COLUMN IF NOT EXISTS status_pagamento text DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS valor_boleto numeric,
ADD COLUMN IF NOT EXISTS codigo_barras text,
ADD COLUMN IF NOT EXISTS beneficiario text;

-- Adicionar campo de observações em pedidos_produtos (criar tabela se não existir)
CREATE TABLE IF NOT EXISTS public.pedidos_produtos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id),
  quantidade numeric NOT NULL,
  preco_unitario numeric NOT NULL,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS para pedidos_produtos
ALTER TABLE public.pedidos_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver pedidos_produtos" ON public.pedidos_produtos
  FOR SELECT USING (true);

CREATE POLICY "Todos podem inserir pedidos_produtos" ON public.pedidos_produtos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Todos podem atualizar pedidos_produtos" ON public.pedidos_produtos
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Todos podem deletar pedidos_produtos" ON public.pedidos_produtos
  FOR DELETE USING (auth.uid() IS NOT NULL);