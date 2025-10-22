-- Adicionar campo tipo_venda à tabela produtos
ALTER TABLE produtos 
ADD COLUMN tipo_venda text NOT NULL DEFAULT 'unidade' CHECK (tipo_venda IN ('kg', 'unidade'));

COMMENT ON COLUMN produtos.tipo_venda IS 'Define se o produto é vendido por kg (cacau) ou por unidade/caixa (pazinhas)';