-- Adicionar coluna de ordenação para marcas
ALTER TABLE marcas 
ADD COLUMN IF NOT EXISTS ordem_exibicao integer DEFAULT 0;

-- Criar índice para performance na ordenação
CREATE INDEX IF NOT EXISTS idx_marcas_ordem ON marcas(ordem_exibicao, nome);