-- Adicionar campos de telefone e WhatsApp na tabela marcas
ALTER TABLE public.marcas 
ADD COLUMN IF NOT EXISTS telefone text,
ADD COLUMN IF NOT EXISTS whatsapp text;

COMMENT ON COLUMN public.marcas.telefone IS 'Telefone de contato da marca';
COMMENT ON COLUMN public.marcas.whatsapp IS 'WhatsApp de contato da marca (com link clicável)';