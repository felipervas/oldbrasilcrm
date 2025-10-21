-- Adicionar campo de observações internas aos pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS observacoes_internas text;