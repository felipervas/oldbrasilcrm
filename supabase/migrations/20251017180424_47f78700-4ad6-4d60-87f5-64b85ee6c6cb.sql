-- FASE 2: Adicionar nome_loja aos produtos
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS nome_loja TEXT;

COMMENT ON COLUMN public.produtos.nome_loja IS 
  'Nome público do produto exibido na loja (diferente do nome interno do CRM)';

-- Copiar nomes existentes para nome_loja como fallback
UPDATE public.produtos 
SET nome_loja = nome 
WHERE nome_loja IS NULL;