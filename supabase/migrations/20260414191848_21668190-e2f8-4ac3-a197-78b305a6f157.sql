
-- Add segmento column to clientes
ALTER TABLE public.clientes ADD COLUMN segmento text DEFAULT 'Outros';
