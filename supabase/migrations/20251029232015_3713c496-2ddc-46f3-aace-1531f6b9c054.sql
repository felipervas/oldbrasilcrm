-- Adicionar campo de endereço/localização nas tarefas para integração com rotas
ALTER TABLE tarefas
ADD COLUMN IF NOT EXISTS endereco_completo text,
ADD COLUMN IF NOT EXISTS latitude numeric(10, 8),
ADD COLUMN IF NOT EXISTS longitude numeric(11, 8);

-- Adicionar comentários para documentação
COMMENT ON COLUMN tarefas.endereco_completo IS 'Endereço completo da tarefa para integração com planejamento de rotas';
COMMENT ON COLUMN tarefas.latitude IS 'Latitude para cálculo de rotas';
COMMENT ON COLUMN tarefas.longitude IS 'Longitude para cálculo de rotas';