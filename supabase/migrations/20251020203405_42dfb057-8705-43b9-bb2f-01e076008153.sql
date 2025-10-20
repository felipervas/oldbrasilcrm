-- FASE 2: Limpar produtos com SKU vazio no banco
-- Converter todos os SKUs vazios (string vazia) para NULL
-- NULL não viola a constraint UNIQUE, permitindo múltiplos produtos sem SKU

UPDATE produtos 
SET sku = NULL 
WHERE sku = '' OR TRIM(sku) = '';