-- Atualizar função handle_updated_at com search_path seguro
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;