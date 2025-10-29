-- Adicionar campo criado_por_id na tabela prospects para rastrear quem criou
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS criado_por_id uuid REFERENCES auth.users(id);

-- Atualizar prospects existentes para ter o criado_por como o responsável atual (fallback)
UPDATE prospects SET criado_por_id = responsavel_id WHERE criado_por_id IS NULL AND responsavel_id IS NOT NULL;