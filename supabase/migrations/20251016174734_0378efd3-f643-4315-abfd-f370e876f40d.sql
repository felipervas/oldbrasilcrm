-- Adicionar campos de frete aos pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tipo_frete TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS transportadora TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS responsavel_venda_id UUID REFERENCES profiles(id);

-- Adicionar contador de pedidos por cliente
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS total_pedidos INTEGER DEFAULT 0;

-- Função para gerar número de pedido sequencial
CREATE SEQUENCE IF NOT EXISTS pedidos_numero_seq START 1;

-- Função para atualizar contadores
CREATE OR REPLACE FUNCTION atualizar_contador_pedidos()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE clientes 
    SET total_pedidos = total_pedidos + 1
    WHERE id = NEW.cliente_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para atualizar contador
DROP TRIGGER IF EXISTS trigger_contador_pedidos ON pedidos;
CREATE TRIGGER trigger_contador_pedidos
  AFTER INSERT ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_contador_pedidos();

-- Atualizar contadores existentes
UPDATE clientes c
SET total_pedidos = (
  SELECT COUNT(*) 
  FROM pedidos p 
  WHERE p.cliente_id = c.id AND p.status != 'cancelado'
);

-- Adicionar campo de horário nas tarefas
ALTER TABLE tarefas ALTER COLUMN titulo DROP NOT NULL;
ALTER TABLE tarefas ALTER COLUMN tipo DROP NOT NULL;
ALTER TABLE tarefas ALTER COLUMN responsavel_id DROP NOT NULL;