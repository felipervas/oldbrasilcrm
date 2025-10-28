-- Adicionar campo motivo_perda para registrar porque não deu certo
ALTER TABLE public.prospects 
ADD COLUMN motivo_perda TEXT;