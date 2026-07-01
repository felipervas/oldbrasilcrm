-- Sequence for sequential pedido numbers
CREATE SEQUENCE IF NOT EXISTS public.pedidos_numero_seq START 1;

-- Trigger function to auto-assign numero
CREATE OR REPLACE FUNCTION public.set_pedido_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := LPAD(nextval('public.pedidos_numero_seq')::text, 7, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_pedido_numero ON public.pedidos;
CREATE TRIGGER trg_set_pedido_numero
BEFORE INSERT ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.set_pedido_numero();

-- Backfill existing pedidos sem numero, em ordem cronologica
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.pedidos WHERE numero IS NULL OR numero = '' ORDER BY created_at ASC LOOP
    UPDATE public.pedidos SET numero = LPAD(nextval('public.pedidos_numero_seq')::text, 7, '0') WHERE id = r.id;
  END LOOP;
END $$;