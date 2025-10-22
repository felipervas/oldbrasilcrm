-- Atualizar todos os produtos GENCAU para serem vendidos por kg
UPDATE produtos 
SET tipo_venda = 'kg'
WHERE marca_id IN (SELECT id FROM marcas WHERE nome ILIKE '%gencau%');