-- Adicionar coluna unidade_medida à tabela produto_tabelas_preco
ALTER TABLE produto_tabelas_preco 
ADD COLUMN IF NOT EXISTS unidade_medida TEXT DEFAULT 'kg';

-- Atualizar produtos existentes baseado no tipo_venda e tipo_embalagem
UPDATE produto_tabelas_preco ptp
SET unidade_medida = CASE 
  WHEN p.tipo_venda = 'kg' THEN 'kg'
  WHEN p.tipo_embalagem = 'caixa' THEN 'caixa'
  ELSE 'unidade'
END
FROM produtos p
WHERE ptp.produto_id = p.id;