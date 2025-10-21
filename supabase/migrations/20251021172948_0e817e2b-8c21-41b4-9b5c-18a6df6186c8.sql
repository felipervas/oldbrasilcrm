-- Adicionar coluna tabela_preco_id em pedidos_produtos
ALTER TABLE pedidos_produtos 
ADD COLUMN IF NOT EXISTS tabela_preco_id UUID REFERENCES produto_tabelas_preco(id);

-- Remover coluna text antiga e adicionar FK UUID em produtos
ALTER TABLE produtos DROP COLUMN IF EXISTS tabela_preco_loja;
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS tabela_preco_loja_id UUID REFERENCES produto_tabelas_preco(id);

COMMENT ON COLUMN produtos.tabela_preco_loja_id IS 'Tabela de preço padrão exibida na loja pública';
COMMENT ON COLUMN pedidos_produtos.tabela_preco_id IS 'Referência à tabela de preço usada no pedido';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pedidos_produtos_tabela ON pedidos_produtos(tabela_preco_id);
CREATE INDEX IF NOT EXISTS idx_produtos_tabela_loja ON produtos(tabela_preco_loja_id);
CREATE INDEX IF NOT EXISTS idx_tabelas_produto_ativo ON produto_tabelas_preco(produto_id, ativo);