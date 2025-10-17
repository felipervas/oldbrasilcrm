-- Corrigir search_path da função atualizar_data_preco
CREATE OR REPLACE FUNCTION atualizar_data_preco()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.preco_por_kg IS DISTINCT FROM NEW.preco_por_kg THEN
    NEW.preco_atualizado_em = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;