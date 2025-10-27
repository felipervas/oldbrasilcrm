-- Adicionar campos de conclusão e comentário aos eventos do colaborador
ALTER TABLE colaborador_eventos 
ADD COLUMN IF NOT EXISTS concluido BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS comentario TEXT;

-- Criar índice para melhorar performance de queries por status
CREATE INDEX IF NOT EXISTS idx_colaborador_eventos_concluido ON colaborador_eventos(colaborador_id, concluido);

-- Criar índice para melhorar performance de queries por data
CREATE INDEX IF NOT EXISTS idx_colaborador_eventos_data ON colaborador_eventos(colaborador_id, data DESC);