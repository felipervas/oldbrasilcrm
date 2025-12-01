-- Adicionar campos bairro e referencia na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS referencia TEXT;