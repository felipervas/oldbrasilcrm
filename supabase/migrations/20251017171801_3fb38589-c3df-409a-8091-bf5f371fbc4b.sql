-- FASE 4: Adicionar campo imagem_banner na tabela marcas
ALTER TABLE public.marcas 
ADD COLUMN IF NOT EXISTS imagem_banner TEXT;

COMMENT ON COLUMN public.marcas.imagem_banner IS 
  'URL do banner da marca para exibição na loja';