-- Adicionar coluna usar_no_site na tabela produto_tabelas_preco
ALTER TABLE produto_tabelas_preco 
ADD COLUMN usar_no_site BOOLEAN DEFAULT false;

-- Criar índice único para garantir que apenas uma tabela por produto pode estar marcada para usar no site
CREATE UNIQUE INDEX idx_uma_tabela_site_por_produto 
ON produto_tabelas_preco (produto_id) 
WHERE usar_no_site = true;

-- Comentários para documentação
COMMENT ON COLUMN produto_tabelas_preco.usar_no_site IS 'Indica se esta tabela de preço deve ser usada para exibição no site/loja';
COMMENT ON INDEX idx_uma_tabela_site_por_produto IS 'Garante que apenas uma tabela por produto pode ser marcada como usar_no_site';