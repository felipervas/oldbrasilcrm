-- Remover constraint unique do SKU primeiro
ALTER TABLE produtos DROP CONSTRAINT IF EXISTS produtos_sku_key;

-- Agora remover a coluna SKU
ALTER TABLE produtos DROP COLUMN IF EXISTS sku;