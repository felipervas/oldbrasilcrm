-- Adicionar campo logo_url na tabela marcas
ALTER TABLE marcas ADD COLUMN IF NOT EXISTS logo_url TEXT;