-- Garantir que ao excluir um pedido, todos os produtos relacionados sejam excluídos
-- Modificar a foreign key para ON DELETE CASCADE

-- Primeiro, dropar a constraint existente
ALTER TABLE pedidos_produtos
DROP CONSTRAINT IF EXISTS pedidos_produtos_pedido_id_fkey;

-- Recriar com ON DELETE CASCADE
ALTER TABLE pedidos_produtos
ADD CONSTRAINT pedidos_produtos_pedido_id_fkey
FOREIGN KEY (pedido_id)
REFERENCES pedidos(id)
ON DELETE CASCADE;