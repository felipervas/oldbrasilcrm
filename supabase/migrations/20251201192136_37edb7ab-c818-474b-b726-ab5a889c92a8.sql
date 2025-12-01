-- Adicionar coluna cliente_id à tabela financeiro
ALTER TABLE financeiro 
ADD COLUMN cliente_id UUID REFERENCES clientes(id);

-- Criar índice para melhorar performance de consultas por cliente
CREATE INDEX idx_financeiro_cliente ON financeiro(cliente_id);

-- Comentário explicativo
COMMENT ON COLUMN financeiro.cliente_id IS 'Vincula um registro financeiro (como boleto) a um cliente específico';