-- Adicionar campo de horário nas tarefas
ALTER TABLE tarefas ADD COLUMN horario TIME;

-- Criar índice para horário
CREATE INDEX IF NOT EXISTS idx_tarefas_horario ON tarefas(horario);